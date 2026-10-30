import { useState } from "react";
import { supabase } from "../supabaseClient";
import { readGuestCart, writeGuestCart, validQuantity } from "../utils/cart";
export function useCart() {
  const [loading, setLoading] = useState(false);
  const addToCart = async (productId, quantity = 1) => {
    if (!validQuantity(quantity) || productId == null) return false;
    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        const uid = session.user.id;
        const { data: existing, error: readError } = await supabase
          .from("cart_items")
          .select("id,quantity")
          .eq("user_id", uid)
          .eq("product_id", productId)
          .maybeSingle();
        if (readError) throw readError;
        const next = (existing?.quantity || 0) + quantity;
        if (!validQuantity(next)) return false;
        const result = existing
          ? await supabase
              .from("cart_items")
              .update({ quantity: next })
              .eq("id", existing.id)
              .eq("user_id", uid)
          : await supabase
              .from("cart_items")
              .insert({ user_id: uid, product_id: productId, quantity });
        if (result.error) throw result.error;
        window.dispatchEvent(new Event("cart-changed"));
      } else {
        const cart = readGuestCart();
        const existing = cart.find((item) => item.productId === productId);
        const next = (existing?.quantity || 0) + quantity;
        if (!validQuantity(next)) return false;
        if (existing) existing.quantity = next;
        else cart.push({ productId, quantity });
        writeGuestCart(cart);
      }
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };
  return { addToCart, loading };
}
