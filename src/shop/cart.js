import { supabase } from "../supabaseClient";
import { packs, pricePaise, quantityLimit } from "./catalog";
export function notifyCartChanged() {
  window.dispatchEvent(new Event("gcmt-cart-change"));
  localStorage.setItem("gcmt.cart.updated", crypto.randomUUID());
}
export function cartLine(row) {
  const p = row.products,
    options = p ? packs(p) : [],
    qty = Number(row.quantity);
  return {
    rowId: row.id,
    product: p,
    productId: row.product_id,
    quantity: qty,
    size: options.length === 1 ? options[0] : "",
    unit: p ? pricePaise(p) : null,
    unresolved:
      !p ||
      options.length > 1 ||
      !Number.isSafeInteger(qty) ||
      qty < 1 ||
      qty > quantityLimit(p),
  };
}
export async function cartRows(owner) {
  if (!owner) throw Error("Restore your session to view this cart.");
  const { data, error } = await supabase
    .from("cart_items")
    .select("id,product_id,quantity,products:products(*)")
    .eq("user_id", owner);
  if (error) throw Error("Your cart could not be loaded.");
  return data.map(cartLine);
}
export function legacyBuffers() {
  return [sessionStorage, localStorage].flatMap((store, index) => {
    try {
      const raw = store.getItem("guest_cart");
      if (!raw) return [];
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows)) throw Error();
      return rows.map((r, i) => ({
        key: index + "-" + i,
        store,
        raw,
        index: i,
        label: index ? "This device" : "This tab",
        owner: r?.user_id ?? r?.userId,
        size: r?.size ?? r?.variant,
        id: r?.productId ?? r?.product_id,
        qty: r?.quantity,
        name: r?.name,
      }));
    } catch {
      return [{ key: String(index), name: "Unreadable saved cart" }];
    }
  });
}
export async function reconcileSavedLine(owner, entry, line, target) {
  const verifyOwner = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (
      error ||
      !owner ||
      data?.session?.user?.id !== owner ||
      (entry.owner && entry.owner !== owner)
    )
      throw Error(
        "Restore the original session before reviewing these quantities.",
      );
  };
  const verifySource = () => {
    if (entry.store.getItem("guest_cart") !== entry.raw)
      throw Error(
        "The saved list changed. Reload the cart and review it again.",
      );
  };
  await verifyOwner();
  verifySource();
  if (!Number.isSafeInteger(target) || target < 1)
    throw Error("Enter a positive whole quantity.");
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", entry.id)
    .single();
  if (
    error ||
    !product ||
    packs(product).length > 1 ||
    (entry.size && !packs(product).includes(entry.size))
  )
    throw Error(
      "This saved pack could not be matched. Its entry is still on this device.",
    );
  if (line && target !== line.quantity) await changeRow(owner, line, target);
  if (!line) {
    const { error: insertError } = await supabase
      .from("cart_items")
      .insert({ user_id: owner, product_id: entry.id, quantity: target });
    if (insertError)
      throw Error(
        "Save could not be confirmed. Reload the cart to check the current quantity.",
      );
  }
  const confirmed = (await cartRows(owner)).filter(
    (l) => l.productId === entry.id,
  );
  if (confirmed.length !== 1 || confirmed[0].quantity !== target)
    throw Error(
      "The account quantity changed. The saved entry is still available for review.",
    );
  await verifyOwner();
  verifySource();
  const remaining = JSON.parse(entry.raw);
  remaining.splice(entry.index, 1);
  if (remaining.length)
    entry.store.setItem("guest_cart", JSON.stringify(remaining));
  else entry.store.removeItem("guest_cart");
  notifyCartChanged();
}
export async function changeRow(owner, line, next) {
  if (
    !owner ||
    !line.rowId ||
    !Number.isSafeInteger(next) ||
    next < 0 ||
    (next > line.quantity && next > quantityLimit(line.product))
  )
    throw Error("Invalid cart change.");
  let query =
    next === 0
      ? supabase.from("cart_items").delete()
      : supabase.from("cart_items").update({ quantity: next });
  const { data, error } = await query
    .eq("id", line.rowId)
    .eq("user_id", owner)
    .eq("quantity", line.quantity)
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw Error(
      "Save could not be confirmed. Reload the cart before trying again.",
    );
  notifyCartChanged();
}
export function total(lines) {
  const valid =
    lines.length > 0 &&
    lines.every(
      (l) =>
        !l.unresolved &&
        Number.isSafeInteger(l.unit) &&
        Number.isSafeInteger(l.quantity) &&
        l.quantity > 0,
    );
  if (!valid) return null;
  const amount = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
  return Number.isSafeInteger(amount) ? amount : null;
}
