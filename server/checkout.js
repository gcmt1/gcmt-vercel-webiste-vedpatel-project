import { isClientProduction } from "./environment.js";
import { gatewayUrls } from "../shared/gateway.js";
import { gatewayReference } from "./reference.js";
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
import { PAYMENT_ID, shippingDetails } from "./validation.js";
export function createCheckoutHandler({
  env = process.env,
  database = () => getDatabase(env),
} = {}) {
  return guarded(async (request) => {
    requireMethod(request, "POST");
    checkOrigin(request, env);
    const body = await readJson(request, 65536);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new HttpError(400, "Invalid checkout request.");
    const cod = body.method === "cod";
    if (body.method !== undefined && !cod)
      throw new HttpError(400, "Invalid payment method.");
    if (cod && env.STORE_COD_ENABLED !== "true")
      throw new HttpError(503, "Cash on delivery is unavailable.");
    if (
      !cod &&
      (env.SECURE_CHECKOUT_ENABLED !== "true" ||
        !Object.hasOwn(gatewayUrls, env.CCA_ENVIRONMENT) ||
        (env.CCA_ENVIRONMENT === "production" && !isClientProduction(env)) ||
        !env.CCA_MERCHANT_ID ||
        !env.CCA_ACCESS_CODE ||
        !env.CCA_WORKING_KEY ||
        env.CCA_CALLBACKS_ENABLED !== "true")
    )
      throw new HttpError(503, "Checkout is temporarily unavailable.");
    if (typeof body.attemptId !== "string" || !PAYMENT_ID.test(body.attemptId))
      throw new HttpError(400, "Invalid checkout attempt.");
    if (
      Object.keys(body).some(
        (key) =>
          ![
            "attemptId",
            "shipping",
            "expectedPaise",
            "expectedLines",
            "method",
          ].includes(key),
      )
    )
      throw new HttpError(400, "Unexpected checkout fields.");
    const db = database();
    const user = await authenticate(request, db);
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
    const origin = siteUrl(env);
    if (
      !Number.isSafeInteger(body.expectedPaise) ||
      body.expectedPaise < 1 ||
      !Array.isArray(body.expectedLines) ||
      !body.expectedLines.length ||
      body.expectedLines.length > 100
    )
      throw new HttpError(400, "Review the cart before checkout.");
    const { data: order, error } = await db.rpc("open_store_checkout", {
      p_owner: user.id,
      p_attempt: (cod ? "COD-" : "") + body.attemptId.toLowerCase(),
      p_shipping: shipping,
      p_expected: body.expectedPaise,
      p_lines: body.expectedLines,
      p_reference: cod ? null : gatewayReference(body.attemptId),
    });
    if (error?.code === "23505")
      throw new HttpError(409, "This checkout attempt was already submitted.");
    if (error || !order) throw new Error("Order creation failed");
    if (order.existing)
      return json({ existing: true, paymentId: order.payment_id });
    if (order.changed || order.invalid)
      throw new HttpError(
        409,
        "Your cart changed or an item is unavailable. Review the cart before paying.",
      );
    if (order.cod) return json({ cod: true, paymentId: order.payment_id });
    const totalPaise = order.total_paise;
    const fields = {
      merchant_id: env.CCA_MERCHANT_ID,
      order_id: order.gateway_reference,
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
    const release = await db.rpc("release_store_handoff", {
      p_owner: user.id,
      p_payment_id: order.payment_id,
      p_generation: order.generation,
    });
    if (release.error) throw new Error("Could not release payment handoff");
    if (release.data !== true)
      return json({ existing: true, paymentId: order.payment_id });
    return json({
      orderId: order.id,
      paymentId: order.payment_id,
      encRequest,
      accessCode: env.CCA_ACCESS_CODE,
      totalPaise,
      gatewayUrl: gatewayUrls[env.CCA_ENVIRONMENT],
    });
  });
}
