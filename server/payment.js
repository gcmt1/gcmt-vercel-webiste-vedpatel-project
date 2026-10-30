import {
  HttpError,
  guarded,
  readBody,
  requireMethod,
  siteUrl,
} from "./http.js";
import { getDatabase } from "./services.js";
import { decryptResponse } from "./ccavenue.js";
import { PAYMENT_ID, toPaise } from "./validation.js";
export function createPaymentHandler({
  env = process.env,
  database = () => getDatabase(env),
} = {}) {
  return guarded(async (request) => {
    requireMethod(request, "POST");
    if (
      env.SECURE_CHECKOUT_ENABLED !== "true" ||
      !env.CCA_WORKING_KEY ||
      !env.CCA_MERCHANT_ID
    )
      throw new HttpError(503, "Payment service is unavailable.");
    if (
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      throw new HttpError(415, "Form data is required.");
    const origin = siteUrl(env);
    const form = new URLSearchParams(await readBody(request, 150000));
    if (form.getAll("encResp").length !== 1)
      throw new HttpError(400, "Invalid payment response.");
    const payment = decryptResponse(form.get("encResp"), env.CCA_WORKING_KEY);
    if (
      !PAYMENT_ID.test(payment.order_id || "") ||
      payment.currency !== "INR" ||
      (payment.merchant_id && payment.merchant_id !== env.CCA_MERCHANT_ID)
    )
      throw new HttpError(400, "Payment details do not match.");
    const states = {
      Success: "SUCCESS",
      Failure: "FAILED",
      Aborted: "FAILED",
      Invalid: "FAILED",
    };
    const status = states[payment.order_status];
    if (
      !status ||
      (status === "SUCCESS" &&
        !/^[A-Za-z0-9_-]{1,100}$/.test(payment.tracking_id || ""))
    )
      throw new HttpError(400, "Payment status is not final or valid.");
    const amountPaise = toPaise(payment.amount);
    const db = database();
    // The database function locks the order and commits payment + receipt atomically.
    const { data, error } = await db.rpc("record_gateway_payment", {
      p_payment_id: payment.order_id,
      p_amount_paise: amountPaise,
      p_currency: payment.currency,
      p_status: status,
      p_tracking_id: payment.tracking_id || null,
    });
    if (error) throw new Error("Payment recording failed");
    if (!data?.accepted)
      throw new HttpError(409, "Payment response could not be reconciled.");
    const path =
      data.payment_status === "SUCCESS"
        ? "/payment-success"
        : "/payment-cancel";
    const redirect = new URL(path, origin);
    redirect.searchParams.set("payment_id", payment.order_id);
    return new Response(null, {
      status: 303,
      headers: {
        Location: redirect.href,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  });
}
