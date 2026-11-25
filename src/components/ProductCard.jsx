import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useAppContext } from "../AppContext";
import { useCart } from "../hooks/useCart";
import {
  money,
  packs,
  photos,
  pricePaise,
  quantityLimit,
} from "../shop/catalog";
import { createIntent } from "../shop/intent";
import { Button } from "./ui";
import QuantitySelector from "./QuantitySelector";
import s from "./shop.module.css";
export default function ProductCard({
  product,
  detail = false,
  heading = "h1",
}) {
  const images = photos(product),
    options = packs(product),
    [index, setIndex] = useState(0),
    [size, setSize] = useState(options.length === 1 ? options[0] : ""),
    [qty, setQty] = useState(1),
    [note, setNote] = useState(""),
    [broken, setBroken] = useState(false);
  const nav = useNavigate(),
    { user, startingGuest } = useAppContext(),
    { addToCart, loading } = useCart(),
    field = useRef(null);
  const actions = useRef(null),
    [showBar, setShowBar] = useState(false);
  useEffect(() => {
    if (!detail || !actions.current) return;
    const footer = document.querySelector("footer");
    const update = () => {
      const pastActions = actions.current?.getBoundingClientRect().bottom < 0;
      const beforeFooter =
        !footer || footer.getBoundingClientRect().top >= window.innerHeight;
      setShowBar(pastActions && beforeFooter);
    };
    const observer = new IntersectionObserver(update);
    if (footer) observer.observe(footer);
    observer.observe(actions.current);
    return () => observer.disconnect();
  }, [detail]);
  const price = pricePaise(product),
    Heading = heading,
    href = "/product/" + product.id;
  function selectImage(next) {
    setIndex(next);
    setBroken(false);
  }
  const navigating = useRef(false);
  function buy() {
    if (navigating.current) return;
    if (options.length && !size) {
      setNote("Choose a pack size first.");
      field.current?.focus();
      return;
    }
    try {
      const id = createIntent(sessionStorage, user?.id, product, size, qty);
      navigating.current = true;
      nav("/checkout?buy=" + id);
    } catch {
      setNote(
        "Unable to open the purchase review. Check the session and try again.",
      );
    }
  }
  async function save() {
    const ok = await addToCart(product.id, qty);
    setNote(
      ok
        ? "Saved to cart."
        : "Could not save this item. Check your cart before retrying.",
    );
  }
  return (
    <article className={detail ? `${s.panel} ${s.detailPanel}` : s.panel}>
      <div className={s.media}>
        <div className={s.stage}>
          {images[index] && !broken ? (
            <img
              src={images[index]}
              alt={product.product_name + " · photo " + (index + 1)}
              fetchPriority="high"
              onError={() => setBroken(true)}
            />
          ) : (
            <p>Product photo unavailable</p>
          )}
        </div>
        {detail && images.length > 1 && (
          <div
            className={s.thumbnails}
            role="group"
            aria-label="Product photos"
          >
            {images.map((url, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show product photo ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => selectImage(i)}
              >
                <span aria-hidden="true">{i + 1}</span>
                <img
                  src={url}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
              </button>
            ))}
          </div>
        )}
        {images.length > 1 && (
          <div className={s.pager}>
            <button
              aria-label="Previous product photo"
              onClick={() =>
                selectImage((index + images.length - 1) % images.length)
              }
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {index + 1} / {images.length}
            </span>
            <button
              aria-label="Next product photo"
              onClick={() => selectImage((index + 1) % images.length)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      <div className={s.purchase}>
        <Heading>
          {detail ? (
            product.product_name
          ) : (
            <Link to={href}>{product.product_name}</Link>
          )}
        </Heading>
        <div className={s.price}>
          {money(price)}{" "}
          {Number(product.product_discount) > 0 && price != null && (
            <del>{money(Math.round(Number(product.product_price) * 100))}</del>
          )}
        </div>
        {product.product_sub_description && (
          <p className={s.description}>{product.product_sub_description}</p>
        )}
        <div className={s.selectors}>
          {options.length > 0 && (
            <label>
              Pack size
              <select
                ref={field}
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setNote("");
                }}
              >
                {options.length > 1 && <option value="">Choose size</option>}
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          )}
          {detail && (
            <div>
              <span className={s.quantityLabel}>Quantity</span>
              <QuantitySelector
                name={product.product_name}
                value={qty}
                max={quantityLimit(product)}
                onChange={setQty}
              />
            </div>
          )}
        </div>
        {quantityLimit(product) === 0 && <p>Currently unavailable</p>}
        <div className={s.actions} ref={actions}>
          <Button
            onClick={buy}
            disabled={
              !user ||
              startingGuest ||
              price == null ||
              !Number.isSafeInteger(qty) ||
              qty < 1 ||
              qty > quantityLimit(product)
            }
          >
            Buy Now
          </Button>
          <Button
            secondary
            disabled={
              !user ||
              loading ||
              options.length > 1 ||
              !Number.isSafeInteger(qty) ||
              qty < 1 ||
              qty > quantityLimit(product)
            }
            onClick={save}
          >
            {detail && <ShoppingBag size={17} aria-hidden="true" />} Add to Cart
          </Button>
        </div>
        {options.length > 1 && (
          <small>Choose Buy Now to order a specific pack.</small>
        )}
        <p role="status">{note}</p>
        <div className={s.links}>
          {!detail && <Link to={href}>Product details</Link>}
          <Link to="/terms-and-conditions">Delivery &amp; replacements</Link>
        </div>
      </div>
      {detail && showBar && (
        <div className={s.sticky}>
          <span>
            {money(price)} · {size || "Choose pack"}
          </span>
          <Button
            onClick={buy}
            disabled={
              !user ||
              startingGuest ||
              price == null ||
              !Number.isSafeInteger(qty) ||
              qty < 1 ||
              qty > quantityLimit(product)
            }
          >
            Buy Now
          </Button>
        </div>
      )}
    </article>
  );
}
