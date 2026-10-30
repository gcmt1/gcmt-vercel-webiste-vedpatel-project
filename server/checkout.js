import {
  HttpError,
  guarded,
  json,
  readJson,
  requireMethod,
  checkOrigin,
  siteUrl,
} from "./http.js";
import { getDatabase, authenticate } from "./services.js";
import { encryptRequest } from "./ccavenue.js";
import { PAYMENT_ID, pricedItems, shippingDetails } from "./validation.js";
export function createCheckoutHandler({
  env = process.env,
  database = () => getDatabase(env),
} = {}) {
  return guarded(async (request) => {
    requireMethod(request, "POST");
    checkOrigin(request, env);
    if (
      env.SECURE_CHECKOUT_ENABLED !== "true" ||
      !env.CCA_MERCHANT_ID ||
      !env.CCA_ACCESS_CODE ||
      !env.CCA_WORKING_KEY
    )
      throw new HttpError(503, "Checkout is temporarily unavailable.");
    const db = database();
    const user = await authenticate(request, db);
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new HttpError(400, "Invalid checkout request.");
    if (!PAYMENT_ID.test(body.attemptId || ""))
      throw new HttpError(400, "Invalid checkout attempt.");
    if (
      Object.keys(body).some((key) => !["attemptId", "shipping"].includes(key))
    )
      throw new HttpError(400, "Unexpected checkout fields.");
    const shipping = shippingDetails(body.shipping);
    const { data: permitted, error: limitError } = await db.rpc(
      "consume_checkout_limit",
      { p_user_id: user.id },
    );
    if (limitError) throw new Error("Checkout rate check failed");
    if (!permitted)
      throw new HttpError(
        429,
        "Too many checkout attempts. Please try again later.",
      );
    const { data: previous, error: previousError } = await db
      .from("orders")
      .select("id")
      .eq("payment_id", body.attemptId)
      .maybeSingle();
    if (previousError) throw new Error("Order lookup failed");
    // Never re-encrypt an existing attempt: concurrent requests must not create payable duplicates.
    if (previous)
      throw new HttpError(
        409,
        "This checkout attempt was already submitted. Please check your orders.",
      );
    const { data: cart, error: cartError } = await db
      .from("cart_items")
      .select("product_id, quantity, products:products(*)")
      .eq("user_id", user.id);
    if (cartError) throw new Error("Cart lookup failed");
    const { items, totalPaise } = pricedItems(cart);
    const origin = siteUrl(env);
    const fields = {
      merchant_id: env.CCA_MERCHANT_ID,
      order_id: body.attemptId,
      amount: (totalPaise / 100).toFixed(2),
      currency: "INR",
      redirect_url: `${origin}/api/payment-response`,
      cancel_url: `${origin}/api/payment-response`,
      language: "EN",
      billing_name: shipping.name,
      billing_address: shipping.street,
      billing_city: shipping.city,
      billing_state: shipping.state,
      billing_zip: shipping.pincode,
      billing_country: "India",
      billing_tel: shipping.phone,
      billing_email: shipping.email,
    };
    const encRequest = encryptRequest(fields, env.CCA_WORKING_KEY);
    const { data: order, error } = await db
      .from("orders")
      .insert({
        user_id: user.id,
        user_name: shipping.name,
        user_email: shipping.email,
        user_phone: shipping.phone,
        address_line: shipping.street,
        city: shipping.city,
        state: shipping.state,
        postal_code: shipping.pincode,
        product_list: items,
        total_amount: totalPaise / 100,
        payment_status: "PENDING",
        order_status: "PENDING",
        payment_id: body.attemptId,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error?.code === "23505")
      throw new HttpError(409, "This checkout attempt was already submitted.");
    if (error || !order) throw new Error("Order creation failed");
    return json({
      orderId: order.id,
      paymentId: body.attemptId,
      encRequest,
      accessCode: env.CCA_ACCESS_CODE,
      totalPaise,
      gatewayUrl:
        "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction",
    });
  });
}
