import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CircleCheck, CircleHelp, CircleX, Clock } from "lucide-react";
import { Page, Button, Notice } from "../components/ui";
import { useAppContext } from "../AppContext";
import { supabase } from "../supabaseClient";
import { lastAttemptKey } from "../shop/checkout";
import { payment, amount } from "../shop/orders";
import s from "../components/commerce.module.css";

export default function PaymentResult() {
  const { user, startingGuest } = useAppContext();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const reference =
    params.get("order_id") ||
    params.get("payment_id") ||
    (user && sessionStorage.getItem(lastAttemptKey(user.id)));
  return (
    <Page narrow>
      <Result
        key={JSON.stringify([user?.id, reference, pathname])}
        owner={user?.id}
        reference={reference}
        interrupted={pathname === "/payment-cancel"}
        starting={startingGuest}
      />
    </Page>
  );
}

function Result({ owner, reference, interrupted, starting }) {
  const [state, setState] = useState({});
  const [version, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    if (owner && reference)
      supabase
        .from("orders")
        .select("id,payment_status,payment_id,total_amount")
        .eq("user_id", owner)
        .eq("payment_id", reference)
        .maybeSingle()
        .then(({ data, error }) => {
          if (active) setState({ order: data, error, ready: true });
        });
    return () => {
      active = false;
    };
  }, [owner, reference, version]);
  const order = state.order;
  const status = order && payment(order).status;
  const Icon =
    status === "Paid"
      ? CircleCheck
      : ["Cancelled", "Failed"].includes(status)
        ? CircleX
        : status === "Pending"
          ? Clock
          : CircleHelp;
  const title =
    status === "Paid"
      ? "Payment confirmed"
      : status
        ? "Payment · " + status
        : interrupted
          ? "Payment interrupted"
          : "Confirm your payment status";
  return (
    <section className={s.card}>
      <Icon size={36} aria-hidden="true" />
      <h1>{title}</h1>
      {starting || (owner && reference && !state.ready) ? (
        <Notice>Checking your order…</Notice>
      ) : order ? (
        <p>
          Order {order.id} · {amount(order.total_amount)}
        </p>
      ) : (
        <p>Open Your orders to check the recorded payment status.</p>
      )}
      {state.error && (
        <Notice error>Payment status could not be loaded.</Notice>
      )}
      {status !== "Paid" && (
        <p>
          If your bank shows a debit, contact GCMT with your payment reference
          before trying again.
        </p>
      )}
      <div className={s.actions}>
        <Button to="/your-orders">Check your orders</Button>
        <Button secondary to="/contact">
          Contact support
        </Button>
        {owner && reference && (
          <Button secondary onClick={() => refresh((n) => n + 1)}>
            Refresh status
          </Button>
        )}
      </div>
    </section>
  );
}
