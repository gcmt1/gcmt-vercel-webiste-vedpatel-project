# GCMT Shop engineering questions

## 1. How do the frontend, backend and database communicate?

React uses the Supabase client for auth, catalog reads and permitted operations such as editing a cart or viewing order history. Checkout and the order confirmation screen call same-origin Node.js endpoints. Those endpoints can verify a session and invoke restricted PostgreSQL functions, while gateway credentials stay on the server. The UI handles a failed request as a service or validation error. Payment and fulfilment status come from the stored order.

[Browser client](../src/supabaseClient.jsx) · [HTTP entry points](../api/)

## 2. How does authentication work, and what happens when a guest signs in?

Before sign-in, a guest basket keeps product IDs, variants and quantities in browser storage. Guest checkout can create an anonymous Supabase identity so the order still has an owner. Converting that identity through account setup can preserve its user ID. Signing in to a different existing account can carry over basket items, while earlier orders remain attached to the identity that placed them. Cart additions use operation IDs so retrying a merge does not count the same addition twice.

[Account setup and sign-in](../src/pages/AuthPage.jsx) · [Guest cart merge](../src/utils/cart.js)

## 3. How are products, carts and orders represented in PostgreSQL?

Products carry their current price, discount, availability and size options. A cart row belongs to one user and identifies a product, a variant and a quantity. The owner, product and variant form a unique key, so two sizes can coexist in the same cart. Each order stores a line-item snapshot alongside its payment and fulfilment statuses. A later catalog edit leaves the recorded order intact. Gateway receipts and response history have separate tables in the private schema.

[Schema bootstrap](../supabase/bootstrap/empty-project.sql) · [Checkout migration](../supabase/migrations/20261122174027_checkout_integrity.sql)

## 4. What happens if the price or variant changes during checkout?

The checkout request carries the line items and total the customer saw. PostgreSQL locks the relevant rows, checks that each product and selected size are available, recalculates prices from the catalog, and compares the lines and total. A substitution that leaves the total unchanged can still invalidate the quote. If the basket has changed, the customer must review it again before the server prepares a payable form.

[Checkout handler](../server/checkout.js) · [Quote comparison in the migration](../supabase/migrations/20261122174027_checkout_integrity.sql)

## 5. Why does the server verify the final price?

Browser prices present the quote to the customer. The database computes the amount it will store for the order in integer paise and returns it to the server for the encrypted gateway request. This ties the outgoing payment amount to the purchase snapshot. On return, the database compares the reported amount with the same stored total. A mismatch prevents the payment from being accepted for that order.

[Checkout handler](../server/checkout.js) · [Payment handler](../server/payment.js)

## 6. How does GCMT Shop integrate with CCAvenue?

The server prepares an encrypted request from the stored order reference, verified amount and shipping details. It then claims the prepared handoff so only one form is released. The browser submits that form to CCAvenue. On return, the payment endpoint decrypts and validates the response before asking PostgreSQL to reconcile it with the order. If the expected merchant fields are missing or invalid, the response is rejected. The merchant sandbox still needs to confirm the field and callback contract.

[Checkout handler](../server/checkout.js) · [Payment lifecycle](payment-lifecycle.md)

## 7. How does the success page know whether an order was paid?

The confirmation screen requests the stored order through the lookup endpoint. The endpoint validates the session and selects the order by reference and authenticated owner. The screen uses the recorded payment status to decide whether to present the purchase as paid. A customer who reaches the page before a valid response has been committed sees the recorded pending state, and a reference from another account cannot retrieve that account's purchase.

[Confirmation screen](../src/pages/PaymentSuccess.jsx) · [Owner-scoped lookup](../server/orders.js)

## 8. What happens if the gateway sends the same response twice?

Settlement locks the order and checks its existing receipt before updating payment or cart data. If the response repeats already accepted evidence, PostgreSQL records the duplicate without consuming the purchased cart items a second time. Unique payment and tracking references also help prevent two orders from settling against one capture. Conflicting evidence can enter review so the stored financial result stays protected while staff investigate.

[Receipt constraints](../supabase/migrations/20261030203438_production_security.sql) · [Settlement and events](../supabase/migrations/20261122174027_checkout_integrity.sql)

## 9. What happens if the customer closes the browser during checkout?

The customer can return under the same identity and check the stored status. If a form was prepared but never released, a new explicit checkout action can revalidate the basket and replace the prepared quote. After release, a lost response and a delivered form are indistinguishable to the server, so checkout returns the existing reference while that attempt remains unresolved. A new payable attempt requires authoritative evidence that the previous one can no longer be paid.

[Checkout recovery](payment-lifecycle.md#recovery-decisions) · [Browser regression tests](../tests/e2e/store.spec.js)

## 10. How do transactions prevent incomplete payment updates?

A successful online reconciliation records the receipt, updates the order, reconciles the purchased cart rows and appends the event in the same PostgreSQL transaction. The stored snapshot identifies which cart row and variant were purchased, so later edits can survive settlement. If a write fails partway through, the changes roll back together. The native PostgreSQL suite injects a failure after settlement starts and verifies a subsequent retry can still complete.

[Settlement transaction](../supabase/migrations/20261122174027_checkout_integrity.sql) · [Native PostgreSQL tests](../tests/postgres/checkout.mjs)

## 11. How are customer records protected and staff permissions enforced?

Supabase grants limit what each database role can do, and row-level policies restrict which records it can access. Customers can read their own order rows. The staff interface checks the user's stored role, while database policies independently protect staff operations. The server's privileged client can bypass those policies, so the API validates the bearer token and applies owner or staff checks as appropriate. A customer who changes a route or reference still faces those checks.

[Access policies](../supabase/migrations/20261030203438_production_security.sql) · [Server authentication and staff checks](../server/services.js)

## 12. How does cash on delivery differ from online payment?

When COD is enabled, checkout applies the same pricing and ownership checks, then commits a cash-due order with the purchased basket change in one transaction. It returns an order reference. An authorised staff member can later record collection on an eligible COD order using a receipt reference. The database records the staff actor and keeps cash collection separate from gateway receipts. An unpaid or cancelled order is displayed according to its recorded status.

[COD endpoints](../server/orders.js) · [COD lifecycle](payment-lifecycle.md#cash-on-delivery-and-invoices)

## 13. How are PDF invoices checked against stored totals?

The browser builds the PDF from the stored order snapshot and escapes order text before rendering it. The generator converts amounts to paise and verifies that each unit price multiplied by its quantity equals the recorded line total. It checks that the sum matches the stored order amount before rendering. Missing or inconsistent totals stop generation so an older record with incomplete data can be reviewed before an invoice is issued.

[Invoice generator](../src/components/InvoiceGenerator.jsx) · [Rendering tests](../tests/security/rendering.test.jsx)

## 14. What did local testing verify, and what remains open?

Vitest covers components, handlers and database policies. Native PostgreSQL tests use independent connections to check concurrent writes and exercise rollback. Playwright drives the built app against local identities, an isolated database and simulated gateway responses, so the tests can check ownership, retries and order recovery with synthetic data. A real merchant account and the hosted Supabase database require separate staging checks before the commercial payment flow can use this implementation.

[Verification commands](../README.md#testing) · [Staging checks](deployment.md#rehearse-in-staging)
