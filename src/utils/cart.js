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
export async function mergeGuestCart(userId, client) {
  const cart = readGuestCart();
  for (const item of cart) {
    const { data, error } = await client
      .from("cart_items")
      .select("id,quantity")
      .eq("user_id", userId)
      .eq("product_id", item.productId)
      .maybeSingle();
    if (error) throw new Error("Could not restore the cart.");
    const quantity = Math.min(100, (data?.quantity || 0) + item.quantity);
    const query = data
      ? client
          .from("cart_items")
          .update({ quantity })
          .eq("id", data.id)
          .eq("user_id", userId)
      : client
          .from("cart_items")
          .insert({ user_id: userId, product_id: item.productId, quantity });
    const result = await query;
    if (result.error) throw new Error("Could not restore the cart.");
    // Remove only successfully merged items so a failed merge does not duplicate quantities on retry.
    writeGuestCart(
      readGuestCart().filter((row) => row.productId !== item.productId),
    );
  }
}

export async function loadCart(userId, client) {
  if (userId) {
    const { data, error } = await client
      .from("cart_items")
      .select(
        "id,product_id,quantity,products:products(id,product_name,product_price,product_discount,product_image)",
      )
      .eq("user_id", userId);
    if (error) throw new Error("Unable to load the cart.");
    return (data || [])
      .filter((row) => row.products && validQuantity(row.quantity))
      .map((row) => ({
        id: row.id,
        productId: row.product_id,
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
            name: product.product_name,
            price: priceFor(product),
            image: String(product.product_image || "").split(",")[0],
            quantity: item.quantity,
          },
        ]
      : [];
  });
}
