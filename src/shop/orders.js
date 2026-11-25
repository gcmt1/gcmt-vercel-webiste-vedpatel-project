export function orderItems(order) {
  try {
    const rows =
      typeof order.product_list === "string"
        ? JSON.parse(order.product_list)
        : order.product_list;
    return Array.isArray(rows)
      ? rows.filter((x) => x && typeof x === "object")
      : [];
  } catch {
    return [];
  }
}
export function amount(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)))
    return "Amount unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value));
}
export function payment(order) {
  const cod = String(order.payment_id || "").startsWith("COD-");
  const state = String(order.payment_status || "").toUpperCase();
  const labels = {
    SUCCESS: cod ? "Collected" : "Paid",
    PAID: "Paid",
    COMPLETED: "Paid",
    PENDING: "Pending",
    COD_PENDING: "Awaiting collection",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    ERROR: "Needs review",
  };
  return {
    method: cod ? "Cash on delivery" : "Online payment",
    status: labels[state] || state || "Unavailable",
  };
}
export function displayDate(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";
}
export const guestUser = (u) =>
  !!u &&
  (u.email?.endsWith("@guest.local") ||
    (/^guest_/.test(u.email || "") && u.email.endsWith("@example.com")) ||
    u.user_metadata?.is_guest === true);
