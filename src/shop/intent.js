import { packs, quantityLimit } from "./catalog";
const prefix = "gcmt.direct.v1.";
const lifetime = 30 * 60 * 1000;
export function validLine(product, size, quantity) {
  const options = packs(product);
  return (
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    quantity <= quantityLimit(product) &&
    (options.length ? options.includes(size) : size === "")
  );
}
export function createIntent(storage, owner, product, size, quantity) {
  if (!owner || !validLine(product, size, quantity))
    throw Error("Choose a valid pack and quantity.");
  const id = crypto.randomUUID();
  storage.setItem(
    prefix + id,
    JSON.stringify({
      owner,
      productId: product.id,
      size,
      quantity,
      created: Date.now(),
    }),
  );
  return id;
}
export function readIntent(storage, id, owner) {
  try {
    const value = JSON.parse(storage.getItem(prefix + id));
    if (
      !value ||
      value.owner !== owner ||
      typeof value.productId !== "string" ||
      typeof value.size !== "string" ||
      !Number.isSafeInteger(value.quantity) ||
      value.quantity < 1 ||
      !Number.isFinite(value.created) ||
      Date.now() < value.created ||
      Date.now() - value.created > lifetime
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function changeIntent(storage, owner, line, next) {
  const intent = readIntent(storage, line.rowId, owner);
  if (
    !intent ||
    intent.quantity !== line.quantity ||
    !validLine(line.product, intent.size, next)
  )
    throw Error("The selection changed. Review the current quantity.");
  storage.setItem(
    prefix + line.rowId,
    JSON.stringify({ ...intent, quantity: next }),
  );
}
