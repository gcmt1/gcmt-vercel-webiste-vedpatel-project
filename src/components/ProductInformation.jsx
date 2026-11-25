import React, { lazy, Suspense, useState } from "react";
import { BookOpen, ChevronDown, Leaf, ListChecks, MessageSquare, Sparkles } from "lucide-react";
import s from "./shop.module.css";

const Reviews = lazy(() => import("./ReviewSystem"));

function benefitItems(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const text = value?.trim();
  if (!text) return [];
  // The catalog also stores lists as quoted entries inside braces.
  if (text.startsWith('{"') && text.endsWith('"}')) {
    try {
      return JSON.parse("[" + text.slice(1, -1) + "]");
    } catch {
      return [text];
    }
  }
  return [text];
}

function InfoCard({ title, icon: Icon, accent = false, children }) {
  return (
    <section className={accent ? `${s.infoCard} ${s.ingredients}` : s.infoCard}>
      <h3><Icon size={21} aria-hidden="true" />{title}</h3>
      {children}
    </section>
  );
}

export default function ProductInformation({ product }) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const benefits = benefitItems(product.key_benefits);
  return (
    <section className={s.information} aria-labelledby="product-information">
      <h2 id="product-information">Product information</h2>
      <div className={s.infoGrid}>
        {product.product_description && (
          <InfoCard title="Description" icon={BookOpen}>
            <p>{product.product_description}</p>
          </InfoCard>
        )}
        {(product.ingredients_name || product.ingredients_description || product.percentage) && (
          <InfoCard title="Ingredients" icon={Leaf} accent>
            {product.ingredients_name && <p className={s.ingredientNames}>{product.ingredients_name.replace(/,\s*/g, ", ")}</p>}
            {product.ingredients_description && <p>{product.ingredients_description}</p>}
            {product.percentage && <p>{product.percentage}</p>}
          </InfoCard>
        )}
        {(product.how_to_use_description || product.pro_tips) && (
          <InfoCard title="How to use" icon={ListChecks}>
            {product.how_to_use_description && <p>{product.how_to_use_description}</p>}
            {product.pro_tips && <p>{product.pro_tips}</p>}
          </InfoCard>
        )}
        {(benefits.length > 0 || product.why_choose_product) && (
          <InfoCard title="Benefits" icon={Sparkles}>
            {benefits.length > 0 && <ul>{benefits.map((item, i) => <li key={i}>{item}</li>)}</ul>}
            {product.why_choose_product && <p>{product.why_choose_product}</p>}
          </InfoCard>
        )}
      </div>
      <details className={s.reviews} onToggle={(e) => setReviewsOpen(e.currentTarget.open)}>
        <summary>
          <MessageSquare size={20} aria-hidden="true" />
          Customer reviews
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        {reviewsOpen && (
          <div className={s.reviewBody}>
            <Suspense fallback="Loading reviews…"><Reviews productId={product.id} /></Suspense>
          </div>
        )}
      </details>
    </section>
  );
}
