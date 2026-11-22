import { PAYMENT_ID } from "./validation.js";

// Base 32 keeps every UUID bit and uses only letters and digits in the merchant reference.
export function gatewayReference(id) {
  if (!PAYMENT_ID.test(id)) throw new TypeError("Invalid attempt reference");
  return (
    "G" +
    BigInt("0x" + id.replaceAll("-", ""))
      .toString(32)
      .padStart(26, "0")
  );
}

export function internalReference(value) {
  if (PAYMENT_ID.test(value)) return value.toLowerCase(); // In-flight legacy checkout.
  if (!/^G[0-7][0-9a-v]{25}$/.test(value)) return null;
  let bits = 0n;
  for (const digit of value.slice(1))
    bits = bits * 32n + BigInt(parseInt(digit, 32));
  const hex = bits.toString(16).padStart(32, "0");
  const id = hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  return PAYMENT_ID.test(id) ? id : null;
}
