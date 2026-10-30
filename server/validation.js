import { HttpError } from "./http.js";
export const PAYMENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function toPaise(value) {
  const text = String(value);
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text))
    throw new HttpError(400, "Invalid monetary value.");
  const [whole, fraction = ""] = text.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise <= 0)
    throw new HttpError(400, "Invalid monetary value.");
  return paise;
}
export function shippingDetails(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Shipping details are required.");
  const limits = {
    name: 200,
    email: 320,
    phone: 10,
    street: 500,
    city: 120,
    state: 120,
    pincode: 6,
  };
  const result = {};
  for (const [name, max] of Object.entries(limits)) {
    const value = input[name];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > max ||
      /[\x00-\x1f\x7f]/.test(value)
    )
      throw new HttpError(400, "Invalid shipping details.");
    result[name] = value.trim();
  }
  result.email = result.email.toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) ||
    !/^\d{10}$/.test(result.phone) ||
    !/^\d{6}$/.test(result.pincode)
  )
    throw new HttpError(400, "Invalid contact details.");
  return result;
}
export function pricedItems(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100)
    throw new HttpError(400, "The cart is empty or too large.");
  let totalPaise = 0;
  const items = rows.map((row) => {
    const product = row.products;
    if (
      !product ||
      product.in_stock === false ||
      !Number.isInteger(row.quantity) ||
      row.quantity < 1 ||
      row.quantity > 100
    )
      throw new HttpError(400, "A cart item is unavailable or invalid.");
    const base = toPaise(product.product_price);
    const discount = Number(product.product_discount || 0);
    if (!Number.isFinite(discount) || discount < 0 || discount >= 100)
      throw new HttpError(400, "A product price needs review.");
    const unitPaise = Math.round((base * (100 - discount)) / 100);
    if (unitPaise < 1)
      throw new HttpError(400, "A product price needs review.");
    totalPaise += unitPaise * row.quantity;
    return {
      product_id: row.product_id,
      name: String(product.product_name).slice(0, 200),
      quantity: row.quantity,
      unit_price: unitPaise / 100,
      total_price: (unitPaise * row.quantity) / 100,
    };
  });
  if (!Number.isSafeInteger(totalPaise) || totalPaise > 100000000)
    throw new HttpError(400, "Order total exceeds the supported limit.");
  return { items, totalPaise };
}
