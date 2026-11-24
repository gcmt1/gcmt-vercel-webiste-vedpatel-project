import { internalReference } from "../../server/reference.js";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { encryptRequest, decryptResponse } from "../../server/ccavenue.js";
const base = "http://127.0.0.1:4173";
const workingKey = "test-" + "key".repeat(8);
const bobPayment = "55555555-5555-4555-8555-555555555555";
async function session(page, request, user = "alice") {
  const data = await (await request.get("/__test/session?user=" + user)).json();
  await page.addInitScript(
    (data) => localStorage.setItem("sb-127-auth-token", JSON.stringify(data)),
    data,
  );
  return data;
}
async function fillShipping(page) {
  for (const [name, value] of Object.entries({
    name: "Customer",
    email: "customer@example.test",
    phone: "9999999999",
    street: "Test street",
    city: "City",
    state: "State",
    pincode: "382001",
  }))
    await page.locator(`#shipping-${name}`).fill(value);
  await page.getByRole("button", { name: "Continue to Payment" }).click();
}
test.beforeEach(async ({ page, request }) => {
  await request.post("/__test/reset");
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
});
test("storefront does not create guest accounts on load and signed-out admin access is gated", async ({
  page,
}) => {
  const signups = [];
  page.on("request", (req) => {
    if (req.url().includes("/auth/v1/signup")) signups.push(req);
  });
  await page.goto("/");
  await expect(page.getByText("Natural Wellness,")).toBeVisible();
  await expect(page.getByText("Test toothpaste").first()).toBeVisible();
  expect(signups).toHaveLength(0);
  await page.goto("/admin-order");
  await expect(
    page.getByRole("heading", { name: "Login / Sign Up", exact: true }),
  ).toBeVisible();
  expect(page.url()).toContain("/auth?returnTo=");
});
test("guest cart survives checkout unavailability without storing a password", async ({
  page,
  request,
}) => {
  await request.post("/__test/reset?mode=disabled");
  await page.goto("/products");
  await page
    .getByRole("button", { name: /Buy Now/i })
    .first()
    .click();
  await expect(page.getByText("Shipping Information")).toBeVisible();
  await fillShipping(page);
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  await expect(
    page.getByText("Checkout is temporarily unavailable."),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("guest_user_password")),
  ).toBeNull();
  await page.goto("/cart");
  await expect(page.getByText("Test toothpaste")).toBeVisible();
});
test("browser checkout uses server prices, reconciles the callback and preserves ownership", async ({
  page,
  request,
}) => {
  await page.goto("/products");
  await page
    .getByRole("button", { name: /Buy Now/i })
    .first()
    .click();
  await fillShipping(page);
  let checkoutBody;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/create-order"))
      checkoutBody = req.postDataJSON();
  });
  await page.route("https://test.ccavenue.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Local gateway simulator</h1>",
    }),
  );
  const gatewayRequest = page.waitForRequest((req) =>
    req.url().startsWith("https://test.ccavenue.com/"),
  );
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  const req = await gatewayRequest;
  await expect(
    page.getByRole("heading", { name: "Local gateway simulator", exact: true }),
  ).toBeVisible();
  const form = new URLSearchParams(req.postData());
  const fields = decryptResponse(form.get("encRequest"), workingKey);
  expect(Object.keys(checkoutBody).sort()).toEqual([
    "attemptId",
    "expectedLines",
    "expectedPaise",
    "shipping",
  ]);
  expect(fields.amount).toBe("90.00");
  expect(fields.redirect_url).toBe(base + "/api/payment-response");
  const response = await request.post("/api/payment-response", {
    form: {
      encResp: encryptRequest(
        {
          order_id: fields.order_id,
          merchant_id: "merchant-test",
          order_status: "Success",
          tracking_id: "gateway-tx-1",
          amount: fields.amount,
          currency: "INR",
        },
        workingKey,
      ),
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  await page.goto(response.headers().location);
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});
test("another customer order cannot be read through either API or the confirmation screen", async ({
  page,
  request,
}) => {
  const data = await session(page, request, "alice");
  const response = await request.get("/api/order?payment_id=" + bobPayment, {
    headers: { Authorization: "Bearer " + data.access_token },
  });
  expect(response.status()).toBe(404);
  const direct = await request.get("/supabase/rest/v1/orders", {
    headers: { Authorization: "Bearer " + data.access_token },
  });
  expect(await direct.json()).toEqual([]);
  await page.goto("/payment-success?payment_id=" + bobPayment);
  await expect(
    page.getByRole("heading", { name: "Order confirmation unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("bob@example.test")).toHaveCount(0);
});
test("pending payments are not displayed as confirmed", async ({
  page,
  request,
}) => {
  await session(page, request, "bob");
  await page.goto("/payment-success?payment_id=" + bobPayment);
  await expect(
    page.getByRole("heading", { name: "Payment not confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toHaveCount(0);
});
test("administrator CSV export quotes text and neutralizes formulas", async ({
  page,
  request,
}) => {
  await session(page, request, "admin");
  await page.goto("/admin-contactform");
  await expect(page.getByText("Contact Form Messages")).toBeVisible();
  await expect(page.getByText('A "quoted", customer')).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByTitle("Export to CSV").click();
  const download = await downloadEvent;
  const text = await readFile(await download.path(), "utf8");
  expect(text).toContain('"A ""quoted"", customer"');
  expect(text).toContain('"\t=1+1"');
});
test("mobile Buy Now takes the selected pack and quantity to checkout", async ({
  page,
  request,
}) => {
  await request.post("/__test/reset?mode=variants");
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/product/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Buy Now", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Test toothpaste · Large")).toBeVisible();
  await expect(page.getByText("Qty: 2", { exact: true })).toBeVisible();
});

test("the selected GCMT size survives the guest basket, account merge and checkout snapshot", async ({
  page,
  request,
}) => {
  await request.post("/__test/reset?mode=variants");
  await page.goto("/product/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await page.getByRole("button", { name: "Add to Cart", exact: true }).click();
  await expect(page.getByText(/Product added to cart!/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cart (1)", exact: true }),
  ).toHaveCount(1);
  await page.goto("/cart");
  await expect(page.getByText("Test toothpaste · Large")).toBeVisible();
  await page.goto("/checkout");
  await fillShipping(page);
  await page.route("https://test.ccavenue.com/**", (r) =>
    r.fulfill({ body: "Test gateway" }),
  );
  const posted = page.waitForRequest((req) =>
    req.url().startsWith("https://test.ccavenue.com/"),
  );
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  const form = new URLSearchParams((await posted).postData());
  const fields = decryptResponse(form.get("encRequest"), workingKey);
  expect(fields.amount).toBe("90.00");
  await page.waitForURL("https://test.ccavenue.com/**");
  await page.goto(
    "/payment-success?payment_id=" + internalReference(fields.order_id),
  );
  await expect(page.getByText(/Test toothpaste · Large/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment not confirmed" }),
  ).toBeVisible();
});
test("unknown pages provide a keyboard-accessible catalog link", async ({
  page,
}) => {
  await page.goto("/no-such-page");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  const link = page.getByRole("link", { name: "Browse GCMT products" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/products$/);
});

test("mobile COD checkout records payment due and never opens a gateway", async ({
  page,
  request,
}) => {
  await request.post("/__test/reset?mode=cod");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Products", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Buy Now/i })
    .first()
    .click();
  await fillShipping(page);
  await page
    .getByRole("button", { name: "Place cash-on-delivery order" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cash-on-delivery order placed" }),
  ).toBeVisible();
  await expect(page.getByText("Payment is due on delivery.")).toBeVisible();
  await page.goto("/your-orders");
  const details = page.getByRole("button", { name: "View Full Details" });
  await details.click();
  const dialog = page.getByRole("dialog", { name: "Order details" });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download Invoice" }).click();
  const pdf = await download;
  expect((await readFile(await pdf.path())).subarray(0, 5).toString()).toBe(
    "%PDF-",
  );
  await dialog.getByRole("button", { name: "Close order details" }).focus();
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});
test("catalog search preserves the query and distinguishes an empty result from a loading failure", async ({
  page,
}) => {
  await page.goto("/products?q=not-in-fixture#products");
  await expect(page.getByText("No products found.")).toBeVisible();
  await page.getByRole("link", { name: "View all products" }).click();
  await expect(page.getByText("Test toothpaste").first()).toBeVisible();
  await page.route("**/rest/v1/products?*", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: '{"message":"Unavailable"}',
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "catalog could not be loaded",
  );
});

test("customer and staff routes open under fixture sessions", async ({
  page,
  request,
}) => {
  await session(page, request, "admin");
  const cases = [
    ["/about", /about/i],
    ["/blog", /wellness insights/i],
    ["/faq", /frequently asked/i],
    ["/tnc", /terms/i],
    ["/terms-and-conditions", /terms/i],
    ["/contact", /contact us/i],
    ["/profile", /my account/i],
    ["/your-orders", /no orders yet/i],
    ["/payment-cancel", /check your payment status/i],
    ["/admin-landing", /admin dashboard/i],
    ["/admin-order", /order management/i],
    ["/admin-subscription", /newsletter subscribers/i],
    ["/admin-product-manager", /product manager/i],
  ];
  for (const [path, title] of cases) {
    await page.goto(path);
    await expect(
      page.locator("main").getByRole("heading", { name: title }).first(),
      path,
    ).toBeVisible();
  }
});
test("a visitor enquiry and newsletter signup reach the staff inboxes", async ({
  page,
  request,
}) => {
  await page.goto("/contact");
  await page.getByLabel("Full Name").fill("Fixture Visitor");
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("visitor@example.test");
  await page.getByLabel("Message", { exact: true }).fill("Fixture enquiry");
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText(/Your message has been sent/)).toBeVisible();
  await page.getByLabel("Newsletter email").fill("reader@example.test");
  const subscribed = page.waitForResponse(
    (r) =>
      r.url().includes("newsletter_subscriptions") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("contentinfo")
    .last()
    .getByRole("button", { name: /subscribe/i })
    .click();
  expect((await subscribed).status()).toBe(201);
  await session(page, request, "admin");
  await page.goto("/admin-subscription");
  await expect(page.getByText("reader@example.test").first()).toBeVisible();
  await page.goto("/admin-contactform");
  await expect(page.getByText("Fixture Visitor").first()).toBeVisible();
});

test("a customer can submit, edit with the keyboard and remove their own review", async ({
  page,
  request,
}) => {
  await session(page, request);
  await page.goto("/product/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await page.getByText("Customer reviews", { exact: true }).click();
  const rating = page.getByRole("button", { name: "Rate 4 of 5" });
  await rating.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Review text").fill("Fixture feedback");
  await page.getByRole("button", { name: "Submit Review" }).click();
  const card = page
    .locator(".rs-card")
    .filter({ hasText: "Fixture feedback" })
    .first();
  await card.getByRole("button", { name: "Edit" }).click();
  const edit = page.locator(".rs-card textarea").first();
  await edit.fill("");
  await edit.pressSequentially("Updated fixture");
  await page
    .getByRole("button", { name: "Update", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Updated fixture", { exact: true }).first(),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".rs-card")
    .getByRole("button", { name: "Delete" })
    .first()
    .click();
  await expect(page.getByText("Updated fixture", { exact: true })).toHaveCount(
    0,
  );
});

test("losing the checkout response and refreshing leads to the same unpaid order without a second gateway form", async ({
  page,
}) => {
  await page.goto("/products");
  await page
    .getByRole("button", { name: /Buy Now/i })
    .first()
    .click();
  await fillShipping(page);
  const released = Promise.withResolvers();
  let gatewayRequests = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).hostname === "test.ccavenue.com") gatewayRequests++;
  });
  await page.route(
    "**/api/create-order",
    async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.abort();
      released.resolve(body);
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  const first = await released.promise;
  expect(first.encRequest).toBeTruthy();
  await page.reload();
  await fillShipping(page);
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  await expect(
    page.getByRole("heading", { name: "Payment not confirmed" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("payment_id")).toBe(
    first.paymentId,
  );
  expect(gatewayRequests).toBe(0);
  await page.goto("/cart");
  await expect(page.getByText("Test toothpaste").first()).toBeVisible();
});

test("a cancelled COD order with a missing total shows neither an amount due nor an active delivery", async ({
  page,
  request,
}) => {
  await request.post("/__test/reset?mode=legacy-cod");
  await session(page, request, "bob");
  await page.goto("/payment-success?payment_id=COD-" + bobPayment);
  await expect(page.getByText("Total: Unavailable")).toBeVisible();
  await expect(page.getByText("Payment is due on delivery.")).toHaveCount(0);
  await page.goto("/your-orders");
  await expect(page.getByText("No delivery expected")).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("₹0.00")).toHaveCount(0);
});
