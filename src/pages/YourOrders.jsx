import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../AppContext";
import { useRecords } from "../shop/useRecords";
import { Page, Button, Notice } from "../components/ui";
import OrderRecord from "../components/OrderRecord";
import s from "../components/commerce.module.css";
export default function Orders() {
  const { user, startingGuest } = useAppContext();
  return (
    <Page narrow>
      <div className={s.stack}>
        <h1>Your orders</h1>
        {startingGuest ? (
          <Notice>Restoring your order history…</Notice>
        ) : user ? (
          <History key={user.id} owner={user.id} />
        ) : (
          <Notice>
            Sign in or restore your guest session to view orders.{" "}
            <Link to="/auth">Sign in</Link>
          </Notice>
        )}
      </div>
    </Page>
  );
}
function History({ owner }) {
  const { data, error, refresh } = useRecords("orders", owner),
    [invoiceError, setError] = useState("");
  async function invoice(order) {
    try {
      const { generateInvoicePDF } =
        await import("../components/InvoiceGenerator");
      await generateInvoicePDF(order);
    } catch {
      setError("Invoice unavailable. Please try again or contact GCMT.");
    }
  }
  return (
    <>
      <div className={s.actions}>
        <Button secondary onClick={refresh}>
          Refresh orders
        </Button>
        <Link to="/contact">Order support</Link>
      </div>
      {error ? (
        <Notice error>Order history could not be loaded.</Notice>
      ) : !data ? (
        <Notice>Loading your orders…</Notice>
      ) : data.length ? (
        data
          .filter((o) => o.user_id === owner)
          .map((o) => (
            <OrderRecord key={o.id} order={o}>
              <Button secondary onClick={() => invoice(o)}>
                Download invoice
              </Button>
            </OrderRecord>
          ))
      ) : (
        <Notice>
          No orders in this session. <Link to="/products">Shop products</Link>
        </Notice>
      )}
      {invoiceError && <Notice error>{invoiceError}</Notice>}
    </>
  );
}
