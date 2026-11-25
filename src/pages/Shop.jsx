import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Page, Button, Field, Notice, LoadingSkeleton } from "../components/ui";
import ProductCard from "../components/ProductCard";
import { useCatalog } from "../shop/catalog";
import video from "../assets/marketing-video.mp4";
import s from "../components/shop.module.css";
import ProductInformation from "../components/ProductInformation";
export default function Shop({ mode }) {
  const { id } = useParams(),
    { data, error, retry } = useCatalog(id),
    [play, setPlay] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = mode === "listing" ? params.get("q") || "" : "";
  const listed = (data || []).filter((p) =>
    (p.product_name || "").toLowerCase().includes(query.trim().toLowerCase()),
  );
  const catalogLayout =
    mode === "listing"
      ? data?.length > 1
        ? s.catalogGrid
        : s.singleListing
      : undefined;
  const detail = mode === "detail",
    home = mode === "home",
    first = data?.[0];
  const title = detail
    ? first?.product_name || "Product details"
    : home
      ? "GCMT Herbal · Oral care"
      : "Shop products";
  return (
    <Page>
      <Helmet>
        <title>{title} | GCMT Shop</title>
        <link
          rel="canonical"
          href={
            "https://www.gcmtshop.com" +
            (id ? "/product/" + id : home ? "/" : "/products")
          }
        />
      </Helmet>
      {!home && (
        <div className={s.crumb}>
          <Link to="/">Home</Link> /{" "}
          {detail ? <Link to="/products">Shop</Link> : "Shop"}
        </div>
      )}
      {mode === "listing" && (
        <header className={s.catalogHeading}>
          <h1>Shop products</h1>
          <p>Browse GCMT personal care and choose your pack.</p>
          {(data?.length > 1 || query) && (
            <Field
              label="Search products"
              type="search"
              value={query}
              onChange={(e) =>
                setParams(e.target.value ? { q: e.target.value } : {}, {
                  replace: true,
                })
              }
            />
          )}
        </header>
      )}
      {error ? (
        <Notice error>
          Products could not be loaded.{" "}
          <Button secondary onClick={retry}>
            Retry
          </Button>
        </Notice>
      ) : !data ? (
        <LoadingSkeleton label="Loading products…" />
      ) : !data.length ? (
        <Notice>
          {detail ? "Product unavailable." : "No products listed."}{" "}
          <Link to="/contact">Contact GCMT</Link>
        </Notice>
      ) : !listed.length ? (
        <Notice>
          No matching products.{" "}
          <Button secondary onClick={() => setParams({})}>
            Clear search
          </Button>
        </Notice>
      ) : (
        <div className={catalogLayout}>
          {(home ? listed.slice(0, 1) : listed).map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              heading={mode === "listing" || i ? "h2" : "h1"}
              detail={detail || home}
            />
          ))}
        </div>
      )}
      {home && first && (
        <section className={s.story}>
          <div>
            <h2>Inside the pack</h2>
            <p>
              {first.ingredients_description || first.product_sub_description}
            </p>
            <Link to={"/product/" + first.id}>
              Ingredients &amp; product details
            </Link>
          </div>
          <div>
            <h2>About GCMT Herbal</h2>
            <p>
              Oral care from Gold Coin Multi-Trade Private Limited in
              Gandhinagar, Gujarat.
            </p>
            <Link to="/about">Our company</Link>
            <details onToggle={(e) => setPlay(e.currentTarget.open)}>
              <summary>Product video</summary>
              {play && (
                <video
                  controls
                  preload="none"
                  aria-label="GCMT Herbal product video"
                  src={video}
                />
              )}
            </details>
          </div>
        </section>
      )}
      {(detail || home) && first && (
        <ProductInformation key={first.id} product={first} />
      )}
    </Page>
  );
}
