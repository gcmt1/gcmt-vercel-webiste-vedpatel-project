import { useState } from "react";
import { supabase } from "../supabaseClient";
import { readGuestCart, writeGuestCart, validQuantity, withGuestCart, cartKey, addStoredItem } from "../utils/cart";
export function useCart() {
  const [loading, setLoading] = useState(false);
  const addToCart = async (productId, quantity = 1, variant = "") => {
    if (!validQuantity(quantity) || productId == null) return false;
    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        await addStoredItem(supabase,{productId,quantity,variant,operationId:crypto.randomUUID()});
        window.dispatchEvent(new Event("cart-changed"));
      } else {
        await withGuestCart(() => {
        const cart = readGuestCart();
        const existing = cart.find((item) => cartKey(item) === cartKey({productId,variant}));
        const next = (existing?.quantity || 0) + quantity;
        if (!validQuantity(next)) throw new Error("Quantity limit exceeded");
        if (existing) existing.quantity = next;
        else cart.push({ productId, quantity, variant });
        writeGuestCart(cart);
        });
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
