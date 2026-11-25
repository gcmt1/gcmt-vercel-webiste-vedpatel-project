import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../AppContext";
import { changeIntent } from "../shop/intent";
import { money, photos, quantityLimit } from "../shop/catalog";
import { changeRow, total } from "../shop/cart";
import {
  attemptKey,
  basketSignature,
  lastAttemptKey,
  reviewLines,
  submitOrder,
} from "../shop/checkout";
import { Page, Button, Field, Notice, LoadingSkeleton } from "../components/ui";
import QuantitySelector from "../components/QuantitySelector";
import s from "../components/commerce.module.css";

const fields = [
  ["name", "Full name", "name"],
  ["email", "Email address", "email", "email"],
  ["phone", "Mobile number", "tel-national", "tel", "[0-9]{10}", "10 digits"],
  ["street", "Street address", "street-address"],
  ["city", "City", "address-level2"],
  ["state", "State", "address-level1"],
  ["pin", "PIN code", "postal-code", "text", "[0-9]{6}", "6 digits"],
];

export default function Checkout() {
  const { search } = useLocation();
  const { user, startingGuest } = useAppContext();
  const id = new URLSearchParams(search).get("buy");
  return (
    <Page>
      <div className={s.stack}>
        <h1>Checkout</h1>
        {startingGuest ? (
          <Notice>Restoring session…</Notice>
        ) : (
          <Review
            key={JSON.stringify([user?.id, id])}
            owner={user?.id}
            id={id}
          />
        )}
      </div>
    </Page>
  );
}

function PaymentOverlay() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={s.paymentOverlay}
      aria-labelledby="gateway-title"
      aria-describedby="gateway-description"
      onCancel={(event) => event.preventDefault()}
    >
      <span aria-hidden="true" className={s.spinner} />
      <h2 id="gateway-title">Connecting to secure payment gateway</h2>
      <p id="gateway-description">
        Please wait. You will be redirected to CCAvenue shortly.
      </p>
    </dialog>
  );
}

function AttemptStatus({ owner, reference, onResolved }) {
  const [status, setStatus] = useState("");
  const [revision, refresh] = useState(0);
  useEffect(() => {
    let current = true;
    async function check() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("user_id", owner)
          .eq("payment_id", reference)
          .maybeSingle();
        if (current)
          setStatus(
            (!error && data?.payment_status?.toUpperCase()) || "UNKNOWN",
          );
      } catch {
        if (current) setStatus("UNKNOWN");
      }
    }
    check();
    return () => {
      current = false;
    };
  }, [reference, owner, revision]);

  const paid = ["PAID", "SUCCESS", "COMPLETED"].includes(status);
  const failed = ["FAILED", "CANCELLED", "CANCELED", "ABORTED"].includes(
    status,
  );
  let message = "Checking the status of your order…";
  if (paid)
    message = "Payment confirmed. You can find this purchase in Your orders.";
  else if (failed)
    message =
      "This payment was unsuccessful. You can review your details and try again.";
  else if (status === "PENDING")
    message =
      "Your payment is pending. Check again before making another payment.";
  else if (status)
    message =
      "We couldn’t confirm your payment status. Check again or contact GCMT with your reference.";

  return (
    <section className={s.card}>
      <h2>Check your payment</h2>
      <p role="status">{message}</p>
      <p className={s.quiet}>Payment reference · {reference}</p>
      <div className={s.actions}>
        <Button to="/your-orders">Check your orders</Button>
        {paid || failed ? (
          <Button secondary onClick={onResolved}>
            {paid ? "Start a separate order" : "Review and retry"}
          </Button>
        ) : (
          <Button
            secondary
            disabled={!status}
            onClick={() => {
              setStatus("");
              refresh((v) => v + 1);
            }}
          >
            Refresh status
          </Button>
        )}
        <Link to="/contact">Contact GCMT</Link>
      </div>
    </section>
  );
}

function Review({ owner, id }) {
  const [lines, setLines] = useState(null);
  const [error, setError] = useState("");
  const [operation, setOperation] = useState(null);
  const processing = operation === "payment";
  const busy = operation !== null;
  const [revision, refresh] = useState(0);
  const key = attemptKey(owner, id);
  const [attempt, setAttempt] = useState(() => localStorage.getItem(key));
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const paymentRequest = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      paymentRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    let current = true;
    setNeedsRefresh(true);
    reviewLines(owner, id)
      .then((rows) => {
        if (current) {
          setLines(rows);
          setNeedsRefresh(false);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [owner, id, revision]);
  useEffect(() => {
    const update = () => {
      setAttempt(localStorage.getItem(key));
    };
    const restore = (event) => {
      if (!event.persisted) return;
      if (paymentRequest.current) {
        paymentRequest.current.abort();
        paymentRequest.current = null;
        lock.current = false;
        setOperation(null);
      }
      update();
    };
    window.addEventListener("storage", update);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("pageshow", restore);
    };
  }, [key]);

  async function edit(line, next) {
    if (lock.current || localStorage.getItem(key)) return;
    lock.current = true;
    setOperation("quantity");
    setError("");
    try {
      if (id === null) await changeRow(owner, line, next);
      else changeIntent(sessionStorage, owner, line, next);
      const rows = await reviewLines(owner, id);
      if (mounted.current) setLines(rows);
    } catch (e) {
      if (mounted.current) {
        setError(e.message);
        setNeedsRefresh(true);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setOperation(null);
    }
  }

  async function pay(e) {
    e.preventDefault();
    if (lock.current || needsRefresh || attempt) return;
    const delivery = Object.fromEntries(
      [...new FormData(e.currentTarget)].map(([k, v]) => [k, v.trim()]),
    );
    if (Object.values(delivery).some((v) => !v)) {
      setError("Complete each delivery field.");
      return;
    }
    lock.current = true;
    setOperation("payment");
    const request = new AbortController();
    paymentRequest.current = request;
    let recorded = false;
    setError("");
    try {
      const handedOff = await navigator.locks.request(key, async () => {
        if (request.signal.aborted) return;
        const previous = localStorage.getItem(key);
        if (previous) {
          setAttempt(previous);
          return;
        }
        const fresh = await reviewLines(owner, id);
        if (request.signal.aborted) return;
        if (
          basketSignature(fresh) !== basketSignature(lines) ||
          !total(fresh) ||
          fresh.some((l) => Number(l.product?.product_discount) > 0)
        ) {
          setLines(fresh);
          throw Error(
            "Your order changed. Review the updated quantities and total before paying.",
          );
        }
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (
          !mounted.current ||
          sessionError ||
          data.session?.user?.id !== owner
        )
          throw Error(
            "Your account changed. Reopen checkout in the correct account.",
          );
        if (request.signal.aborted) return;
        const reference = crypto.randomUUID();
        sessionStorage.setItem(lastAttemptKey(owner), reference);
        localStorage.setItem(key, reference);
        recorded = true;
        setAttempt(reference);
        await submitOrder(owner, fresh, delivery, reference, request.signal);
        return !request.signal.aborted;
      });
      // Native form submission starts navigation. Keep checkout locked until it leaves.
      if (handedOff) return;
    } catch (err) {
      if (mounted.current && !request.signal.aborted) {
        setError(
          recorded
            ? "Payment initialization could not be confirmed. Check the order below."
            : err.message,
        );
      }
    }
    if (mounted.current && paymentRequest.current === request) {
      paymentRequest.current = null;
      lock.current = false;
      setOperation(null);
    }
  }
  const recovery = attempt && !processing && (
    <AttemptStatus
      key={attempt}
      reference={attempt}
      owner={owner}
      onResolved={() => {
        if (localStorage.getItem(key) === attempt) localStorage.removeItem(key);
        setAttempt(localStorage.getItem(key));
        setError("");
        setNeedsRefresh(true);
        refresh((v) => v + 1);
      }}
    />
  );
  if (!lines?.length && recovery) return recovery;
  function retry() {
    setError("");
    refresh((v) => v + 1);
  }
  if (!lines)
    return error ? (
      <Notice error>
        {error}{" "}
        <Button secondary onClick={retry}>
          Retry review
        </Button>{" "}
        <Link to="/products">Shop products</Link>
      </Notice>
    ) : (
      <LoadingSkeleton label="Checking current prices…" />
    );
  if (!lines.length)
    return (
      <div className={s.card}>
        <h2>Your cart is empty</h2>
        <Link to="/products">Shop products</Link>
      </div>
    );
  const amount = total(lines);
  const discounted = lines.some((l) => Number(l.product?.product_discount) > 0);
  const blocked = discounted || !amount || !navigator.locks;
  return (
    <div className={s.checkout}>
      <form id="delivery" className={s.card} onSubmit={pay}>
        <h2>Contact &amp; delivery</h2>
        <div className={s.deliveryFields}>
          {fields.map(
            ([name, label, autoComplete, type = "text", pattern, hint]) => (
              <Field
                key={name}
                name={name}
                label={label}
                autoComplete={autoComplete}
                required
                type={type}
                pattern={pattern}
                inputMode={pattern ? "numeric" : undefined}
                placeholder={hint}
                readOnly={busy || !!attempt}
              />
            ),
          )}
        </div>
        <h2>Payment method</h2>
        <div className={s.actions}>
          <CreditCard aria-hidden="true" size={20} /> Online payment via
          CCAvenue
        </div>
      </form>
      <aside className={s.card}>
        <h2>{id === null ? "Order summary" : "Direct purchase"}</h2>
        {lines.map((l) => (
          <div key={l.rowId} className={s.row}>
            {l.product && photos(l.product)[0] && (
              <img src={photos(l.product)[0]} alt="" />
            )}
            <div className={s.grow}>
              <strong>{l.product?.product_name || "Unavailable item"}</strong>
              <p>
                {l.size} · {money(l.unit)} each
              </p>
              <QuantitySelector
                value={l.quantity}
                max={quantityLimit(l.product)}
                name={l.product?.product_name}
                disabled={busy || !!attempt || needsRefresh}
                onChange={(n) => edit(l, n)}
              />
              <p>
                Line subtotal ·{" "}
                <strong>
                  {money(l.unit == null ? null : l.unit * l.quantity)}
                </strong>
              </p>
            </div>
          </div>
        ))}
        <div className={s.pair}>
          Subtotal <span>{money(amount)}</span>
        </div>
        <div className={s.pair}>
          Shipping <span>{money(0)}</span>
        </div>
        <div className={s.pair + " " + s.payable}>
          Total payable <strong aria-live="polite">{money(amount)}</strong>
        </div>
        {blocked && (
          <Notice>
            {discounted
              ? "Contact GCMT to confirm the discounted price before paying."
              : !navigator.locks
                ? "Open checkout in a browser that supports secure payment coordination."
                : "Review unavailable items or quantities before paying."}
          </Notice>
        )}
        {error && (
          <Notice error>
            {error}{" "}
            {needsRefresh && (
              <Button secondary onClick={retry}>
                Reload quantities
              </Button>
            )}
          </Notice>
        )}
        {recovery}
        <Button
          form="delivery"
          type="submit"
          disabled={busy || !!attempt || needsRefresh || blocked}
        >
          {processing ? (
            <>
              <span className={s.spinner} aria-hidden="true" />
              Processing payment…
            </>
          ) : (
            `Pay ${money(amount)}`
          )}
        </Button>
        <Link to={id === null ? "/cart" : "/product/" + lines[0].product.id}>
          {id === null ? "Edit cart" : "Product details"}
        </Link>
      </aside>
      {processing && <PaymentOverlay />}
    </div>
  );
}
