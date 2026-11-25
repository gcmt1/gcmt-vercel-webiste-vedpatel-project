import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { changeRow, notifyCartChanged } from "../shop/cart";
export function useCart() {
  const [loading, setLoading] = useState(false),
    pending = useRef(false);
  async function addToCart(productId, quantity = 1) {
    if (pending.current || !Number.isSafeInteger(quantity) || quantity < 1)
      return false;
    pending.current = true;
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;
      const owner = session.user.id;
      const { data, error } = await supabase
        .from("cart_items")
        .select("id,quantity,products:products(*)")
        .eq("user_id", owner)
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        await changeRow(
          owner,
          { rowId: data.id, quantity: data.quantity, product: data.products },
          Number(data.quantity) + quantity,
        );
      } else {
        const result = await supabase
          .from("cart_items")
          .insert({ user_id: owner, product_id: productId, quantity })
          .select("id")
          .single();
        if (result.error || !result.data) return false;
        notifyCartChanged();
      }
      return true;
    } catch {
      return false;
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  return { loading, addToCart };
}
