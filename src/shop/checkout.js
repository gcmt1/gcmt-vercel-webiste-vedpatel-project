import { supabase } from "../supabaseClient";
import { cartRows, total } from "./cart";
import { readIntent, validLine } from "./intent";
import { pricePaise } from "./catalog";

export async function reviewLines(owner, id) {
  if (!owner) throw Error("Restore your shopping session to continue.");
  if (id === null) return cartRows(owner);
  const intent = readIntent(sessionStorage, id, owner);
  if (!intent)
    throw Error(
      "This purchase expired or belongs to a different session. Choose the product again.",
    );
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", intent.productId)
    .single();
  if (
    error ||
    !product ||
    !validLine(product, intent.size, intent.quantity) ||
    pricePaise(product) == null
  )
    throw Error("This product or pack has changed. Check its product page.");
  return [
    {
      rowId: id,
      product,
      quantity: intent.quantity,
      size: intent.size,
      unit: pricePaise(product),
    },
  ];
}

export const attemptKey = (owner, id) =>
  "gcmt.checkout.v2." + owner + "." + (id || "cart");
export const lastAttemptKey = (owner) => "gcmt.payment.return." + owner;

export function basketSignature(lines) {
  return JSON.stringify(
    lines
      .map((l) => [
        l.rowId,
        l.product?.id,
        l.size,
        l.quantity,
        l.unit,
        !!l.unresolved,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

const callback =
  "https://gcmtshop-cca-backend-kappa.vercel.app/api/paymentResponse";
const realStore = ["https://www.gcmtshop.com", "https://gcmtshop.com"].includes(
  window.location.origin,
);

// The deployed checkout accepts an explicit product_list and a rupee amount.
// A single verified snapshot supplies both requests, without touching the cart.
export async function submitOrder(owner, lines, delivery, reference, signal) {
  const amount = total(lines);
  if (lines.some((line) => Number(line.product?.product_discount) > 0))
    throw Error("Confirm the discounted price before paying.");
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw Error("Check the payable total.");
  const order = {
    user_id: owner,
    user_name: delivery.name,
    user_email: delivery.email.toLowerCase(),
    user_phone: delivery.phone,
    address_line: delivery.street,
    city: delivery.city,
    state: delivery.state,
    postal_code: delivery.pin,
    product_list: lines.map((l) => ({
      product_id: l.product.id,
      name: l.product.product_name,
      size: l.size,
      quantity: l.quantity,
      unit_price: l.unit / 100,
      total_price: (l.quantity * l.unit) / 100,
    })),
    total_amount: amount / 100,
    payment_status: "PENDING",
    order_status: "PENDING",
    created_at: new Date().toISOString(),
    payment_id: reference,
  };
  const { data, error } = await supabase
    .from("orders")
    .insert([order])
    .select("id, payment_id, user_id")
    .single();
  if (
    error ||
    !data?.id ||
    data.user_id !== owner ||
    data.payment_id !== reference
  )
    throw Error("The order acknowledgement could not be verified.");
  if (signal?.aborted) return;
  const request = {
    order_id: reference,
    amount: (amount / 100).toFixed(2),
    currency: "INR",
    redirect_url: callback,
    cancel_url: callback,
    language: "EN",
    billing_name: order.user_name,
    billing_address: order.address_line,
    billing_city: order.city,
    billing_state: order.state,
    billing_zip: order.postal_code,
    billing_country: "India",
    billing_tel: order.user_phone,
    billing_email: order.user_email,
    merchant_param1: String(data.id),
    merchant_param2: owner,
    merchant_param3: order.user_email,
  };
  const response = await fetch(
    realStore
      ? "https://gcmtshop-cca-backend-kappa.vercel.app/api/createOrder"
      : "/api/createOrder",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  if (!response.ok)
    throw Error("The payment service did not confirm the request.");
  const { encRequest, accessCode } = await response.json();
  if (
    typeof encRequest !== "string" ||
    !encRequest.trim() ||
    typeof accessCode !== "string" ||
    !accessCode.trim()
  )
    throw Error("The payment handoff could not be verified.");
  if (signal?.aborted) return;
  const form = document.createElement("form");
  form.method = "POST";
  form.action = realStore
    ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
    : "/api/review-payment";
  for (const [name, value] of Object.entries({
    encRequest,
    access_code: accessCode,
  })) {
    const input = document.createElement("input");
    Object.assign(input, { type: "hidden", name, value });
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
