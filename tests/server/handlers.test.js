// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createCheckoutHandler } from "../../server/checkout.js";
import { createPaymentHandler } from "../../server/payment.js";
import { createOrderLookup, createCodUpdate } from "../../server/orders.js";
import { decryptResponse, encryptRequest } from "../../server/ccavenue.js";
const userId = "11111111-1111-4111-8111-111111111111";
const attemptId = "44444444-4444-4444-8444-444444444444";
const env = {
  SECURE_CHECKOUT_ENABLED: "true",
  SITE_URL: "https://shop.example.test",
  CCA_MERCHANT_ID: "merchant-test",
  CCA_ACCESS_CODE: "test-access",
  CCA_WORKING_KEY: "test-" + "key".repeat(8),
};
const shipping = {
  name: "Customer",
  email: "customer@example.test",
  phone: "9999999999",
  street: "Test street",
  city: "City",
  state: "State",
  pincode: "382001",
};
function database(options = {}) {
  const writes = [];
  const queries = [];
  const db = {
    writes,
    queries,
    auth: {
      getUser: vi.fn(async (token) => ({
        data: { user: token === "valid" ? { id: userId } : null },
        error: token === "valid" ? null : { message: "Invalid" },
      })),
    },
    rpc: vi.fn(async (name) => ({
      data:
        name === "consume_checkout_limit"
          ? (options.rateAllowed ?? true)
          : { accepted: options.accepted ?? true, payment_status: "SUCCESS" },
      error: null,
    })),
    from(table) {
      const filters = [];
      let op = "select";
      let payload;
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push([k, v]);
          return q;
        },
        like(k, v) {
          filters.push([k, v]);
          return q;
        },
        insert(value) {
          op = "insert";
          payload = value;
          writes.push({ table, op, payload });
          return q;
        },
        update(value) {
          op = "update";
          payload = value;
          writes.push({ table, op, payload });
          return q;
        },
        async result() {
          queries.push({ table, op, filters });
          if (table === "users")
            return { data: { role: options.role || "user" }, error: null };
          if (table === "cart_items")
            return {
              data: options.cart ?? [
                {
                  product_id: "p1",
                  quantity: 2,
                  products: {
                    product_name: "Product",
                    product_price: "100.00",
                    product_discount: 10,
                    in_stock: true,
                  },
                },
              ],
              error: null,
            };
          if (table === "orders" && op === "insert")
            return {
              data: { id: "order-1" },
              error: options.duplicate ? { code: "23505" } : null,
            };
          if (table === "orders" && op === "update")
            return {
              data: options.codFound ? { id: "order-1" } : null,
              error: null,
            };
          return { data: options.order ?? null, error: null };
        },
        single() {
          return q.result();
        },
        maybeSingle() {
          return q.result();
        },
        then(resolve, reject) {
          return q.result().then(resolve, reject);
        },
      };
      return q;
    },
  };
  return db;
}
const checkoutRequest = (body = { attemptId, shipping }, extra = {}) =>
  new Request("https://shop.example.test/api/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid",
      Origin: env.SITE_URL,
      ...extra,
    },
    body: JSON.stringify(body),
  });
const callbackRequest = (fields) =>
  new Request("https://shop.example.test/api/payment-response", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      encResp: encryptRequest(fields, env.CCA_WORKING_KEY),
    }),
  });
const callbackFields = {
  order_id: attemptId,
  order_status: "Success",
  amount: "180.00",
  currency: "INR",
  tracking_id: "test-transaction",
};
describe("authoritative checkout", () => {
  it("uses database prices and the verified user, not browser-controlled totals or identity", async () => {
    const db = database();
    const response = await createCheckoutHandler({ env, database: () => db })(
      checkoutRequest(),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    const fields = decryptResponse(payload.encRequest, env.CCA_WORKING_KEY);
    expect(fields.amount).toBe("180.00");
    expect(fields.redirect_url).toBe(env.SITE_URL + "/api/payment-response");
    expect(db.writes[0].payload).toMatchObject({
      user_id: userId,
      total_amount: 180,
      payment_status: "PENDING",
      order_status: "PENDING",
    });
    expect(
      db.queries.find((x) => x.table === "cart_items").filters,
    ).toContainEqual(["user_id", userId]);
  });
  it("rejects additional amount/status/user fields and malformed input before inserting", async () => {
    for (const body of [
      null,
      [],
      { attemptId, shipping, amount: 1 },
      { attemptId, shipping, user_id: "other" },
      { attemptId, shipping, payment_status: "SUCCESS" },
      { attemptId: "bad", shipping },
      { attemptId, shipping: { ...shipping, phone: "bad" } },
    ]) {
      const db = database();
      const response = await createCheckoutHandler({ env, database: () => db })(
        checkoutRequest(body),
      );
      expect(response.status).toBe(400);
      expect(db.writes).toHaveLength(0);
    }
  });
  it("rejects missing/invalid authorization, wrong method, wrong origin, oversize bodies and disabled checkout", async () => {
    const db = database();
    const handler = createCheckoutHandler({ env, database: () => db });
    expect(
      (await handler(checkoutRequest(undefined, { Authorization: "" }))).status,
    ).toBe(401);
    expect(
      (
        await handler(
          checkoutRequest(undefined, { Authorization: "Bearer forged" }),
        )
      ).status,
    ).toBe(401);
    expect(
      (await handler(new Request("https://shop.example.test/api/create-order")))
        .status,
    ).toBe(405);
    expect(
      (
        await handler(
          checkoutRequest(undefined, { Origin: "https://evil.example.test" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handler(
          checkoutRequest({
            attemptId,
            shipping: { ...shipping, street: "x".repeat(9000) },
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await createCheckoutHandler({
          env: { ...env, SECURE_CHECKOUT_ENABLED: "false" },
          database: () => db,
        })(checkoutRequest())
      ).status,
    ).toBe(503);
    expect(db.writes).toHaveLength(0);
  });
  it("rejects invalid cart quantities/stock and rate-limited attempts", async () => {
    for (const quantity of [-1, 0, 1.5, 101]) {
      const db = database({
        cart: [{ product_id: "p", quantity, products: { product_price: 100 } }],
      });
      expect(
        (
          await createCheckoutHandler({ env, database: () => db })(
            checkoutRequest(),
          )
        ).status,
      ).toBe(400);
      expect(db.writes).toHaveLength(0);
    }
    const db = database({ rateAllowed: false });
    expect(
      (
        await createCheckoutHandler({ env, database: () => db })(
          checkoutRequest(),
        )
      ).status,
    ).toBe(429);
  });
  it("does not initiate a second payment for an existing or concurrent attempt", async () => {
    const existing = database({ order: { id: "existing" } });
    expect(
      (
        await createCheckoutHandler({ env, database: () => existing })(
          checkoutRequest(),
        )
      ).status,
    ).toBe(409);
    expect(existing.writes).toHaveLength(0);
    const raced = database({ duplicate: true });
    expect(
      (
        await createCheckoutHandler({ env, database: () => raced })(
          checkoutRequest(),
        )
      ).status,
    ).toBe(409);
  });
});
describe("payment response boundary", () => {
  it("decodes URL-encoded values and records only a validated encrypted response", async () => {
    const db = database();
    const response = await createPaymentHandler({ env, database: () => db })(
      callbackRequest({ ...callbackFields, billing_name: "A & B" }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      env.SITE_URL + "/payment-success?payment_id=" + attemptId,
    );
    expect(db.rpc).toHaveBeenCalledWith("record_gateway_payment", {
      p_payment_id: attemptId,
      p_amount_paise: 18000,
      p_currency: "INR",
      p_status: "SUCCESS",
      p_tracking_id: "test-transaction",
    });
  });
  it("does not update orders from unsigned query/body order IDs or invalid ciphertext", async () => {
    const db = database();
    const handler = createPaymentHandler({ env, database: () => db });
    expect(
      (
        await handler(
          new Request(
            "https://shop.example.test/api/payment-response?order_id=" +
              attemptId,
          ),
        )
      ).status,
    ).toBe(405);
    const req = new Request("https://shop.example.test/api/payment-response", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "order_id=" + attemptId + "&encResp=not-valid",
    });
    expect((await handler(req)).status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.writes).toHaveLength(0);
  });
  it("rejects mismatched merchant/currency, malformed amounts, nonfinal status and missing success tracking ID", async () => {
    for (const fields of [
      { ...callbackFields, currency: "USD" },
      { ...callbackFields, merchant_id: "other" },
      { ...callbackFields, amount: "1e2" },
      { ...callbackFields, order_status: "Awaited" },
      { ...callbackFields, tracking_id: "" },
    ]) {
      const db = database();
      expect(
        (
          await createPaymentHandler({ env, database: () => db })(
            callbackRequest(fields),
          )
        ).status,
      ).toBe(400);
      expect(db.rpc).not.toHaveBeenCalled();
    }
  });
  it("does not redirect as successful when database reconciliation rejects a callback", async () => {
    const db = database({ accepted: false });
    const response = await createPaymentHandler({ env, database: () => db })(
      callbackRequest(callbackFields),
    );
    expect(response.status).toBe(409);
    expect(response.headers.get("location")).toBeNull();
  });
  it("roundtrips the CCAvenue key/IV protocol with dummy fixtures and rejects duplicate fields", () => {
    expect(
      decryptResponse(
        encryptRequest(callbackFields, env.CCA_WORKING_KEY),
        env.CCA_WORKING_KEY,
      ),
    ).toEqual(callbackFields);
    const pairs = [...Object.entries(callbackFields), ["amount", "1.00"]];
    expect(() =>
      decryptResponse(
        encryptRequest(pairs, env.CCA_WORKING_KEY),
        env.CCA_WORKING_KEY,
      ),
    ).toThrow(/Ambiguous/);
  });
});
describe("order and admin access", () => {
  it("requires an explicit reference and queries both the reference and authenticated owner", async () => {
    const db = database({ order: { id: "owned" } });
    const handler = createOrderLookup({ env, database: () => db });
    expect(
      (
        await handler(
          new Request("https://shop.example.test/api/order", {
            headers: { Authorization: "Bearer valid" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          new Request(
            "https://shop.example.test/api/order?payment_id=" + attemptId,
            { headers: { Authorization: "Bearer valid" } },
          ),
        )
      ).status,
    ).toBe(200);
    expect(db.queries[0].filters).toEqual([
      ["payment_id", attemptId],
      ["user_id", userId],
    ]);
  });
  it("checks the database admin role before allowing COD payment changes", async () => {
    const db = database();
    const request = () =>
      checkoutRequest({ orderId: "order-1", status: "SUCCESS" });
    expect(
      (await createCodUpdate({ env, database: () => db })(request())).status,
    ).toBe(403);
    expect(db.writes).toHaveLength(0);
    const admin = database({ role: "admin", codFound: true });
    expect(
      (await createCodUpdate({ env, database: () => admin })(request())).status,
    ).toBe(200);
    expect(admin.queries.find((q) => q.op === "update").filters).toContainEqual(
      ["payment_id", "COD-%"],
    );
  });
});
