// Historical orders may contain a serialized JSON array from the earlier checkout.
export function orderItems(value) {
  try {
    const items = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(items) && items.every(item => item && typeof item === 'object' && !Array.isArray(item)) ? items : [];
  } catch {
    return [];
  }
}

export function paidOrderTotal(orders) {
  let paise = 0;
  for (const order of orders) {
    if (!['SUCCESS', 'PAID', 'COMPLETED'].includes(String(order.payment_status).toUpperCase())) continue;
    if (order.total_amount == null || String(order.total_amount).trim() === '') return null;
    const amount = Math.round(Number(order.total_amount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 0) return null;
    paise += amount;
  }
  return Number.isSafeInteger(paise) ? paise / 100 : null;
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatOrderAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return 'Unavailable';
  if (String(value).trim() === '' || !Number.isFinite(Number(value))) return 'Unavailable';
  return rupees.format(Number(value));
}
