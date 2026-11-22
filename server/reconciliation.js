import { internalReference } from "./reference.js";
import { toPaise } from "./validation.js";

// The merchant kit supplies the authenticated status-inquiry transport.
// Invoke from a trusted worker. Browser returns and operator-entered amounts are unsuitable inputs.
export async function reconcileBatch({
  database,
  inquire,
  merchantId,
  timeoutMs = 8000,
}) {
  if (!inquire || !merchantId)
    return { configured: false, examined: 0, recorded: 0 };
  const { data: due, error } = await database.rpc("claim_store_inquiries");
  if (error) throw new Error("Unable to claim reconciliation work.");
  let recorded = 0;
  for (const row of due || []) {
    const reference = row.gateway_reference || row.payment_id;
    try {
      const evidence = await inquire(reference, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (
        !evidence ||
        evidence.order_id !== reference ||
        internalReference(reference) !== row.payment_id ||
        evidence.merchant_id !== merchantId ||
        evidence.currency !== "INR" ||
        !["Success", "Failure", "Aborted", "Invalid"].includes(
          evidence.order_status,
        )
      )
        continue;
      const status = evidence.order_status === "Success" ? "SUCCESS" : "FAILED";
      if (
        status === "SUCCESS" &&
        !/^[A-Za-z0-9_-]{1,100}$/.test(evidence.tracking_id || "")
      )
        continue;
      const { data, error } = await database.rpc("record_store_response", {
        p_payment_id: row.payment_id,
        p_reference: reference,
        p_amount_paise: toPaise(evidence.amount),
        p_currency: "INR",
        p_status: status,
        p_tracking_id: evidence.tracking_id || null,
      });
      if (!error && data?.accepted) recorded++;
    } catch {
      // Claim leases and bounded backoff survive transport or database failures.
    }
  }
  return { configured: true, examined: due?.length || 0, recorded };
}
