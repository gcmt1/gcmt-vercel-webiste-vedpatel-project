import { formatOrderAmount, orderItems } from "../utils/orders";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../AppContext";
import { authenticatedFetch } from "../utils/api";
import "../styles/PaymentSuccess.css";
const paidStatuses = new Set(["SUCCESS", "PAID", "COMPLETED"]);
export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const { user, loading: authLoading } = useAppContext();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading) return;
    setOrderData(null);
    setError("");
    if (!user || !paymentId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    authenticatedFetch(
      `/api/order?payment_id=${encodeURIComponent(paymentId)}`,
      { signal: controller.signal },
    )
      .then(({ order }) => {
        if (!controller.signal.aborted) setOrderData(order);
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setError(
            "Unable to load this order. Check your order history or contact support.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, user?.id, paymentId]);
  if (authLoading || loading)
    return (
      <div className="payment-success-page">
        <p role="status">Loading order details…</p>
      </div>
    );
  if (!user)
    return (
      <div className="payment-success-page">
        <h1>Sign in to view your order</h1>
        <button
          onClick={() =>
            navigate(
              `/auth?returnTo=${encodeURIComponent("/payment-success?payment_id=" + encodeURIComponent(paymentId || ""))}`,
            )
          }
        >
          Sign in
        </button>
      </div>
    );
  if (!paymentId || error || !orderData)
    return (
      <div className="payment-success-page">
        <h1>Order confirmation unavailable</h1>
        <p>{error || "Open a specific order from your order history."}</p>
        <button onClick={() => navigate("/your-orders")}>View orders</button>
      </div>
    );
  const paid = paidStatuses.has(String(orderData.payment_status).toUpperCase());
  const cod = orderData.payment_id?.startsWith("COD-");
  const fulfilment = String(orderData.order_status).toUpperCase();
  const codDue = cod && String(orderData.payment_status).toUpperCase() === "COD_PENDING" &&
    ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED"].includes(fulfilment);
  return (
    <div className="payment-success-page">
      <div className="success-content">
        <div className="success-header animate">
          <h1>{paid ? "Payment confirmed" : codDue ? "Cash-on-delivery order placed" : "Payment not confirmed"}</h1>
          <p>
            {paid
              ? "Thank you. Your payment has been recorded."
              : codDue ? "Payment is due on delivery." : "Your order is not marked as paid. Check its status before making another payment."}
          </p>
        </div>
        <div className="order-details-card animate">
          <div className="order-header">
            <h2>Order #{orderData.id}</h2>
            <span>{orderData.order_status || "Unknown"}</span>
          </div>
          <section className="section customer-info">
            <h3>Customer information</h3>
            <p>{orderData.user_name}</p>
            <p>{orderData.user_email}</p>
            <p>{orderData.user_phone}</p>
          </section>
          <section className="section shipping-info">
            <h3>Shipping address</h3>
            <p>{orderData.address_line}</p>
            <p>
              {orderData.city}, {orderData.state} — {orderData.postal_code}
            </p>
          </section>
          <section className="section order-items">
            <h3>Order items</h3>
            {orderItems(orderData.product_list).map((item, index) => (
              <div className="item-row" key={index}>
                <span>
                  {item.name}{item.variant && ` · ${item.variant}`} × {item.quantity}
                </span>
                <span>{formatOrderAmount(item.total_price)}</span>
              </div>
            ))}
          </section>
          <section className="section payment-info">
            <h3>Payment details</h3>
            <p>Status: {orderData.payment_status || "Unknown"}</p>
            <p>Reference: {orderData.payment_id}</p>
            <strong>Total: {formatOrderAmount(orderData.total_amount)}</strong>
          </section>
        </div>
        <div className="action-buttons animate">
          <button onClick={() => navigate("/products")}>
            Continue shopping
          </button>
          <button onClick={() => navigate("/your-orders")}>View orders</button>
        </div>
      </div>
    </div>
  );
}
