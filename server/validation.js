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
