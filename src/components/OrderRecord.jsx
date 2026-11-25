import React from "react";
import { amount, payment, displayDate, orderItems } from "../shop/orders";
import s from "./commerce.module.css";
export default function OrderRecord({ order, children }) {
  const pay = payment(order),
    items = orderItems(order);
  return (
    <article className={s.card}>
      <div className={s.pair}>
        <h2>Order {String(order.id).slice(-8)}</h2>
        <strong>{amount(order.total_amount)}</strong>
      </div>
      <p className={s.quiet}>
        {displayDate(order.created_at)} · {pay.method}
      </p>
      <div className={s.actions}>
        <span className={s.badge} data-payment={pay.status}>
          Payment · {pay.status}
        </span>
        <span className={s.badge}>
          Fulfillment · {order.order_status || "Unavailable"}
        </span>
      </div>
      <div>
        {items.length
          ? items.map((l, i) => (
              <p key={i}>
                {l.name || "Recorded item"}
                {l.size ? " · " + l.size : ""} × {l.quantity ?? "—"}
              </p>
            ))
          : "No item details recorded."}
      </div>
      {order.tracking_number && (
        <p>Tracking number · {order.tracking_number}</p>
      )}
      <details>
        <summary>Order details</summary>
        <p>Reference · {order.id}</p>
        {order.payment_id && <p>Payment reference · {order.payment_id}</p>}
        {order.shipped_at && <p>Shipped · {displayDate(order.shipped_at)}</p>}
        {order.delivered_at && (
          <p>Delivered · {displayDate(order.delivered_at)}</p>
        )}
        {order.estimated_delivery_date && (
          <p>
            Estimated delivery · {displayDate(order.estimated_delivery_date)}
          </p>
        )}
        <p>
          {[
            order.user_name,
            order.address_line,
            order.city,
            order.state,
            order.postal_code,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>
        {items.map((l, i) => (
          <p key={i}>
            {l.name} · {amount(l.unit_price)} each · {amount(l.total_price)}
          </p>
        ))}
      </details>
      {children}
    </article>
  );
}
