import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
export const packs = (p) => [
  ...new Set(
    (p.size || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];
export function quantityLimit(product) {
  if (!product || product.in_stock === false) return 0;
  const limit = Number(product.stock ?? 100);
  return Number.isSafeInteger(limit) ? Math.max(0, Math.min(100, limit)) : 0;
}
export function pricePaise(p) {
  if (p.product_price == null || String(p.product_price).trim() === "")
    return null;
  const price = Number(p.product_price),
    discount = Number(p.product_discount || 0);
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  )
    return null;
  return Math.round((Math.round(price * 100) * (100 - discount)) / 100);
}
export const money = (paise) =>
  Number.isSafeInteger(paise)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: paise % 100 ? 2 : 0,
      }).format(paise / 100)
    : "Price unavailable";
export function photos(p) {
  return (p.product_image || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      if (/^https:\/\//i.test(v)) return v;
      if (/^[a-z]+:|^\/\//i.test(v)) return null;
      return supabase.storage.from("product-image").getPublicUrl(v).data
        .publicUrl;
    })
    .filter(Boolean);
}
export function useCatalog(id) {
  const [state, set] = useState({}),
    [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    let query = supabase.from("products").select("*");
    if (id) query = query.eq("id", id);
    Promise.resolve(query)
      .then(({ data, error }) => {
        if (active) set({ id, attempt, data: data || [], error });
      })
      .catch((error) => {
        if (active) set({ id, attempt, error });
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);
  return {
    ...(state.id === id && state.attempt === attempt ? state : {}),
    retry: () => retry((n) => n + 1),
  };
}
