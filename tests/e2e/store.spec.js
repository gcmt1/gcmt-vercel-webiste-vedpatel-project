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
    await page.locator(`input[name="${name}"]`).fill(value);
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
  await page.route("https://secure.ccavenue.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Local gateway simulator</h1>",
    }),
  );
  const gatewayRequest = page.waitForRequest((req) =>
    req.url().startsWith("https://secure.ccavenue.com/"),
  );
  await page.getByRole("button", { name: /Pay .* Now/ }).click();
  const req = await gatewayRequest;
  await expect(
    page.getByRole("heading", { name: "Local gateway simulator", exact: true }),
  ).toBeVisible();
  const form = new URLSearchParams(req.postData());
  const fields = decryptResponse(form.get("encRequest"), workingKey);
  expect(Object.keys(checkoutBody).sort()).toEqual(["attemptId", "shipping"]);
  expect(fields.amount).toBe("90.00");
  expect(fields.redirect_url).toBe(base + "/api/payment-response");
  const response = await request.post("/api/payment-response", {
    form: {
      encResp: encryptRequest(
        {
          order_id: fields.order_id,
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
