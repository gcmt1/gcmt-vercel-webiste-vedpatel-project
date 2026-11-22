const KEY = "guest_cart";
export function validQuantity(value) {
  return Number.isInteger(value) && value >= 1 && value <= 100;
}
export function readGuestCart() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item) =>
          item &&
          typeof item.productId !== "object" &&
          item.productId != null &&
          validQuantity(item.quantity),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
export function writeGuestCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-changed"));
}
export function clearGuestCart() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("cart-changed"));
}
export function priceFor(product) {
  const price = Number(product.product_price);
  const discount = Number(product.product_discount || 0);
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount >= 100
  )
    return 0;
  return Math.round((Math.round(price * 100) * (100 - discount)) / 100) / 100;
}
export const cartKey = (item) => JSON.stringify([String(item.productId),item.variant || ""]);
export function withGuestCart(action) {
  return navigator.locks ? navigator.locks.request("gcmt-guest-cart",action) : action();
}
export async function addStoredItem(client,item) {
  const {error} = await client.rpc("add_store_cart_item", {
    p_product:String(item.productId), p_variant:item.variant || "", p_quantity:item.quantity,
    p_operation:item.operationId
  });
  if (error) throw new Error("Could not update the cart. Review the size and quantity.");
}
export async function mergeGuestCart(userId, client) {
  if (!userId) throw new Error("Sign in to restore the cart.");
  await withGuestCart(async () => {
    const items = readGuestCart();
    if (!items.length) return;
    for (const item of items) item.operationId ||= crypto.randomUUID();
    writeGuestCart(items);
    while (items.length) {
      await addStoredItem(client,items[0]);
      items.shift();
      writeGuestCart(items);
    }
  });
}

export async function loadCart(userId, client) {
  if (userId) {
    const { data, error } = await client
      .from("cart_items")
      .select(
        "id,product_id,variant,quantity,products:products(id,product_name,product_price,product_discount,product_image)",
      )
      .eq("user_id", userId);
    if (error) throw new Error("Unable to load the cart.");
    return (data || [])
      .filter((row) => row.products && validQuantity(row.quantity))
      .map((row) => ({
        id: row.id,
        productId: row.product_id,
        variant:row.variant || "",
        name: row.products.product_name,
        price: priceFor(row.products),
        image: String(row.products.product_image || "").split(",")[0],
        quantity: row.quantity,
      }));
  }
  const cart = readGuestCart();
  if (!cart.length) return [];
  const { data, error } = await client
    .from("products")
    .select("id,product_name,product_price,product_discount,product_image")
    .in(
      "id",
      cart.map((item) => item.productId),
    );
  if (error) throw new Error("Unable to load the cart.");
  return cart.flatMap((item) => {
    const product = (data || []).find(
      (product) => String(product.id) === String(item.productId),
    );
    return product
      ? [
          {
            productId: product.id,
            variant:item.variant || "",
            name: product.product_name,
            price: priceFor(product),
            image: String(product.product_image || "").split(",")[0],
            quantity: item.quantity,
          },
        ]
      : [];
  });
}
