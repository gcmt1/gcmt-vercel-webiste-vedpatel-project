// Run against scripts/local-review.cjs. All orders and gateway posts stay on loopback.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, webkit } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = "http://127.0.0.1:" + (process.env.REVIEW_PORT || 4189);
const screenshots = process.env.SCREENSHOT_DIR;
const { sku } = require("./fixtures/store.cjs");
const fields = {
  name: "Sample Buyer",
  email: "buyer@example.invalid",
  phone: "9000000000",
  street: "Fixture House",
  city: "Example City",
  state: "Gujarat",
  pin: "380001",
};
const pay = (page) => page.locator('button[form="delivery"]');
const overlay = (page) =>
  page.getByRole("dialog", { name: "Connecting to secure payment gateway" });
async function enterCheckout(ctx, role, fromCart = false) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  if (fromCart) {
    await page.goto(base + "/cart?review=" + role);
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
  } else await page.goto(base + "/checkout?review=" + role);
  for (const [name, value] of Object.entries(fields)) {
    await page.locator('#delivery [name="' + name + '"]').fill(value);
  }
  await pay(page).scrollIntoViewIfNeeded();
  return page;
}
async function checkFields(page) {
  assert.deepEqual(
    await page
      .locator("#delivery input")
      .evaluateAll((inputs) =>
        Object.fromEntries(inputs.map((input) => [input.name, input.value])),
      ),
    fields,
  );
}
async function fixture(browser, width, run) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    hasTouch: width < 500,
    isMobile: width < 500,
    serviceWorkers: "block",
  });
  await ctx.route("**/*", (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort(),
  );
  // Supply the fixture thumbnail from the repository without a network request.
  await ctx.route(sku.product_image.split(",")[0], (route) =>
    route.fulfill({
      contentType: "image/jpeg",
      path: path.join(__dirname, "../src/assets/product.jpg"),
    }),
  );
  try {
    await run(ctx);
  } finally {
    await ctx.close();
  }
}
// Release each step explicitly, including the response to the native form POST.
async function hold(page, pattern) {
  let release, arrived;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const request = new Promise((resolve) => {
    arrived = resolve;
  });
  await page.route(
    pattern,
    async (route) => {
      arrived(route.request());
      await pending;
      await route.continue();
    },
    { times: 1 },
  );
  return { request, release };
}
async function transition(ctx, role, device) {
  const page = await enterCheckout(ctx, role);
  const nav = [],
    inserts = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) nav.push(new URL(frame.url()).pathname);
  });
  page.on("request", (req) => {
    if (
      req.method() === "POST" &&
      req.url().startsWith(base + "/rest/v1/orders")
    )
      inserts.push(req.postDataJSON()[0]);
  });
  const review = await hold(page, "**/rest/v1/cart_items?**");
  const create = await hold(page, "**/api/createOrder");
  const handoff = await hold(page, "**/api/review-payment");
  await page.evaluate(() => {
    window.addEventListener(
      "pagehide",
      () => {
        sessionStorage.setItem(
          "fixture.handoff",
          JSON.stringify({
            locked: document.querySelector("dialog")?.matches(":modal"),
            processing: document.querySelector('button[form="delivery"]')
              ?.textContent,
            fields: Object.fromEntries(
              new FormData(document.querySelector("#delivery")),
            ),
          }),
        );
      },
      { once: true },
    );
  });
  await pay(page).evaluate((el) => {
    el.click();
    el.form.requestSubmit();
  });
  await review.request;
  await overlay(page).waitFor();
  assert.equal((await pay(page).innerText()).trim(), "Processing payment…");
  assert(await pay(page).locator("span").isVisible());
  assert.equal(inserts.length, 0);
  assert(await pay(page).isDisabled());
  assert(await page.locator("aside button").first().isDisabled());
  await checkFields(page);
  const cart = page.locator('header a[href="/cart"]');
  const bounds = await cart.boundingBox();
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  assert(await overlay(page).isVisible());
  assert.equal(
    await cart.evaluate((el) => {
      el.focus();
      return el === document.activeElement;
    }),
    false,
  );
  assert.equal(
    await page
      .locator("#delivery input")
      .first()
      .evaluate((el) => {
        el.focus();
        return el === document.activeElement;
      }),
    false,
  );
  assert.equal(new URL(page.url()).pathname, "/checkout");
  if (screenshots) {
    fs.mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, device + ".png") });
  }
  review.release();
  const gateway = (await create.request).postDataJSON();
  assert(await overlay(page).isVisible());
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].total_amount, 300);
  assert.equal(gateway.amount, "300.00");
  assert.equal(gateway.order_id, inserts[0].payment_id);
  assert.equal(gateway.merchant_param2, inserts[0].user_id);
  assert.equal(inserts[0].product_list[0].quantity, 2);
  create.release();
  const post = await handoff.request;
  assert.equal(post.method(), "POST");
  assert.equal(
    new URLSearchParams(post.postData()).get("encRequest"),
    gateway.order_id,
  );
  handoff.release();
  await page.getByRole("heading", { name: "Simulated payment" }).waitFor();
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("fixture.handoff")),
    ),
    {
      locked: true,
      processing: "Processing payment…",
      fields,
    },
  );
  assert.deepEqual(nav, ["/api/review-payment"]);
  await page.goBack();
  await page.getByText(/Your payment is pending/).waitFor();
  assert(await pay(page).isDisabled());
  console.log(
    device,
    role,
    "passed: immediate lock, input and navigation protection, direct INR 300 handoff, back recovery",
  );
}
async function leaveCheckout(ctx) {
  const page = await enterCheckout(ctx, "guest", true);
  const create = await hold(page, "**/api/createOrder");
  let handoffs = 0;
  page.on("request", (req) => {
    if (req.url() === base + "/api/review-payment") handoffs++;
  });
  await pay(page).click();
  await create.request;
  const key = await page.evaluate(() =>
    Object.keys(localStorage).find((k) => k.startsWith("gcmt.checkout.v2.")),
  );
  await page.goBack();
  await page.getByRole("heading", { name: "Your cart", exact: true }).waitFor();
  create.release();
  // Wait for the original checkout task to release its lock before asserting.
  await page.evaluate((key) => navigator.locks.request(key, () => {}), key);
  assert.equal(handoffs, 0);
  assert.equal(new URL(page.url()).pathname, "/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await page.getByText(/Your payment is pending/).waitFor();
  assert(await pay(page).isDisabled());
  console.log(
    "passed: leaving checkout via browser Back prevents a stale handoff; returning checks the original order",
  );
}
async function recovery(ctx, role) {
  const page = await enterCheckout(ctx, role);
  const cart = "**/rest/v1/cart_items?**";
  const orders = "**/rest/v1/orders?**";
  await page.route(
    cart,
    (r) =>
      r.fulfill({ status: 403, json: { message: "Fixture read failure" } }),
    { times: 1 },
  );
  await pay(page).click();
  await page.getByText("Your cart could not be loaded.").waitFor();
  assert.equal(await overlay(page).count(), 0);
  assert(await pay(page).isEnabled());
  await checkFields(page);

  let reference,
    owner,
    status = null,
    inserts = 0,
    gatewayRequests = 0,
    checks = 0;
  await page.route(orders, async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      inserts++;
      const order = req.postDataJSON()[0];
      reference = order.payment_id;
      owner = order.user_id;
      return route.continue();
    }
    const params = new URL(req.url()).searchParams;
    assert.equal(params.get("user_id"), "eq." + owner);
    assert.equal(params.get("payment_id"), "eq." + reference);
    checks++;
    if (status === null)
      return route.fulfill({
        status: 403,
        json: { message: "Status unavailable" },
      });
    return route.fulfill({ json: [{ payment_status: status }] });
  });
  await page.route("**/api/createOrder", (r) => {
    gatewayRequests++;
    return r.abort();
  });
  await pay(page).click();
  await page.getByText(/We couldn’t confirm your payment status/).waitFor();
  assert.equal(await overlay(page).count(), 0);
  assert(await pay(page).isDisabled());
  await checkFields(page);
  status = "PENDING";
  await page.getByRole("button", { name: "Refresh status" }).click();
  await page.getByText(/Your payment is pending/).waitFor();
  assert(await pay(page).isDisabled());
  await page.locator("#delivery").evaluate((form) => form.requestSubmit());
  status = "FAILED";
  await page.getByRole("button", { name: "Refresh status" }).click();
  await page.getByRole("button", { name: "Review and retry" }).click();
  await page.waitForFunction(
    () => document.querySelector('button[form="delivery"]')?.disabled === false,
  );
  await checkFields(page);
  assert.equal(inserts, 1);
  assert.equal(gatewayRequests, 1);
  assert.equal(checks, 3);
  console.log(
    role,
    "passed: preflight recovery, failed gateway, unavailable and pending status block retry, confirmed failure restores review with all seven fields",
  );
}
(async () => {
  const engine = process.env.REVIEW_ENGINE === "webkit" ? webkit : chromium;
  const browser = await engine.launch();
  try {
    await fixture(browser, 390, leaveCheckout);
    for (const [width, role, device] of [
      [1440, "customer", "desktop"],
      [390, "guest", "mobile"],
    ]) {
      await fixture(browser, width, (ctx) => transition(ctx, role, device));
      await fixture(browser, width, (ctx) => recovery(ctx, role));
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
