import { createHash, createCipheriv, createDecipheriv } from "node:crypto";
import { HttpError } from "./http.js";
// Fixed IV and MD5 key derivation are required by the CCAvenue integration protocol.
const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
function keyFor(workingKey) {
  if (typeof workingKey !== "string" || !workingKey)
    throw new HttpError(503, "Payment service is not configured.");
  return createHash("md5").update(workingKey, "utf8").digest();
}
export function encryptRequest(fields, workingKey) {
  const cipher = createCipheriv("aes-128-cbc", keyFor(workingKey), iv);
  return Buffer.concat([
    cipher.update(new URLSearchParams(fields).toString(), "utf8"),
    cipher.final(),
  ]).toString("hex");
}
export function decryptResponse(encrypted, workingKey) {
  if (
    typeof encrypted !== "string" ||
    encrypted.length > 131072 ||
    !/^(?:[0-9a-f]{32})+$/i.test(encrypted)
  )
    throw new HttpError(400, "Invalid payment response.");
  let plain;
  try {
    const decipher = createDecipheriv("aes-128-cbc", keyFor(workingKey), iv);
    plain = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid payment response.");
  }
  const params = new URLSearchParams(plain);
  for (const name of [
    "order_id",
    "order_status",
    "amount",
    "currency",
    "tracking_id",
    "merchant_id",
  ]) {
    if (params.getAll(name).length > 1)
      throw new HttpError(400, "Ambiguous payment response.");
  }
  return Object.fromEntries(params);
}
