import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../AppContext";
import {
  cartRows,
  changeRow,
  legacyBuffers,
  reconcileSavedLine,
  total,
} from "../shop/cart";
import { photos, money, useCatalog, quantityLimit } from "../shop/catalog";
import { Page, Button, Notice, Field } from "../components/ui";
import QuantitySelector from "../components/QuantitySelector";
import s from "../components/commerce.module.css";
export default function Cart() {
  const { user, startingGuest } = useAppContext();
  return (
    <Page>
      <div className={s.stack}>
        <h1>Your cart</h1>
        {startingGuest ? (
          <Notice>Restoring your cart…</Notice>
        ) : (
          <Basket key={user?.id} owner={user?.id} />
        )}
      </div>
    </Page>
  );
}
function SavedLine({ entry, owner, line, label, onSaved }) {
  const [target, setTarget] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await reconcileSavedLine(owner, entry, line, Number(target));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={s.form}>
      <strong>{label}</strong>
      <p>
        {entry.label} · {entry.qty ?? "Unknown"} saved · {line?.quantity ?? 0}{" "}
        in this cart
      </p>
      {owner &&
        entry.id &&
        Number.isSafeInteger(Number(entry.qty)) &&
        Number(entry.qty) > 0 &&
        (!entry.owner || entry.owner === owner) && (
          <>
            <Field
              label="Resulting cart quantity"
              type="number"
              min="1"
              step="1"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Button secondary disabled={busy} type="submit">
              Use this total
            </Button>
          </>
        )}
      {error && <Notice error>{error}</Notice>}
    </form>
  );
}
function SavedEntries({ entries, owner, lines, onSaved }) {
  const { data } = useCatalog();
  return (
    <section className={s.card}>
      <h2>Saved on this device</h2>
      <p>
        Choose the total you want in this cart for each entry. Each saved list
        is reviewed separately.
      </p>
      {entries.map((entry) => (
        <SavedLine
          key={entry.key + entry.raw}
          entry={entry}
          owner={owner}
          line={lines.find((l) => l.productId === entry.id)}
          label={
            data?.find((p) => p.id === entry.id)?.product_name ||
            entry.name ||
            entry.id ||
            "Unrecognized entry"
          }
          onSaved={onSaved}
        />
      ))}
    </section>
  );
}
function Basket({ owner }) {
  const [lines, setLines] = useState(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [rev, reload] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setLines(null);
    cartRows(owner)
      .then((v) => {
        if (active) setLines(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [owner, rev]);
  async function edit(l, n) {
    setPending(true);
    try {
      await changeRow(owner, l, n);
      reload((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  const older = legacyBuffers();
  return (
    <>
      {older.length > 0 && lines && !error && (
        <SavedEntries
          entries={older}
          owner={owner}
          lines={lines}
          onSaved={() => reload((v) => v + 1)}
        />
      )}
      {error ? (
        <Notice error>
          {error}{" "}
          <Button secondary onClick={() => reload((v) => v + 1)}>
            Reload cart
          </Button>
        </Notice>
      ) : !lines ? (
        <Notice>Loading your items…</Notice>
      ) : lines.length === 0 ? (
        <div className={s.card}>
          <h2>Your cart is empty</h2>
          <Link to="/products">Browse products</Link>
        </div>
      ) : (
        <div className={s.columns}>
          <div className={s.card}>
            {lines.map((l) => (
              <div key={l.rowId} className={s.row}>
                {l.product && photos(l.product)[0] && (
                  <img src={photos(l.product)[0]} alt="" />
                )}
                <div className={s.grow}>
                  <strong>
                    {l.product?.product_name || "Unavailable product"}
                  </strong>
                  <p>
                    {l.size || "Pack unspecified"} · {money(l.unit)} each
                  </p>
                  {l.unresolved && <p>Review this item before checkout.</p>}
                  <QuantitySelector
                    name={l.product?.product_name}
                    value={l.quantity}
                    max={quantityLimit(l.product)}
                    disabled={pending}
                    onChange={(n) => edit(l, n)}
                  />
                  <p>
                    Line subtotal ·{" "}
                    {money(l.unit == null ? null : l.unit * l.quantity)}
                  </p>
                </div>
                <button disabled={pending} onClick={() => edit(l, 0)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <aside className={s.card}>
            <h2>Order summary</h2>
            <div className={s.pair}>
              Catalog subtotal<strong>{money(total(lines))}</strong>
            </div>
            {total(lines) != null && !pending ? (
              <Button to="/checkout">Proceed to checkout</Button>
            ) : (
              <Notice>Review unavailable items first.</Notice>
            )}
            <Link to="/products">Continue shopping</Link>
          </aside>
        </div>
      )}
    </>
  );
}
