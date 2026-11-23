# GCMT Shop — Full-Stack Ecommerce and Order Management

GCMT Shop is a React storefront and staff workspace for GCMT Herbal. Customers can browse products, choose sizes, manage a cart and follow their orders. Staff manage the catalog, product images, order fulfilment, enquiries and newsletter subscriptions.

The central engineering problem is keeping the cart a customer reviewed, their authenticated identity, the amount charged by the gateway and the stored order in agreement. The checkout API and PostgreSQL enforce that relationship from quote through settlement, including when a browser disconnects or a gateway response arrives twice.

## What the application does

| Area | Capabilities in this source |
| --- | --- |
| Product discovery | Search and filter the catalog, open product details and select an available size where a product offers one. |
| Carts | Keep a guest basket in the browser, then merge its items into the cart associated with a Supabase identity. |
| Checkout | Reprice the cart on the server and prepare a CCAvenue payment or a cash-on-delivery (COD) order when that method is enabled. |
| Order history | View recorded payment and fulfilment status and download a PDF invoice for eligible records. |
| Staff operations | Maintain products and images, update and archive orders, and record cash collection for eligible COD orders. |
| Reviews and communications | Submit and manage product reviews, send enquiries and join the newsletter. Staff can review enquiries and subscriptions and export them as CSV. |

## Run locally

Use Node.js 24.15 or later in the 24.x line and npm 11.9.0, the version pinned for CI. From the repository root, run:

```bash
npm ci
npm run review
```

Open <http://127.0.0.1:4173>. The preview builds the React app and serves it with synthetic accounts, products and orders backed by an isolated, in-memory PostgreSQL database (PGlite). Both checkout methods are disabled in this mode. Setup requires no Supabase project, merchant account or credentials.

Press **Ctrl+C** to stop the preview. Run `npm run review` again after source changes to rebuild the app and reset the sample data. For connected development, see [deployment and staging](docs/deployment.md#rehearse-in-staging).

## Follow a customer order

```mermaid
flowchart TD
    Product["Choose a product and size"] --> Cart["Review cart and shipping details"]
    Cart --> Identity["Sign in or continue with an anonymous identity"]
    Identity --> Quote["API validates identity, PostgreSQL reprices the cart"]
    Quote -->|Cart or quote changed| Cart
    Quote -->|Quote matches| Order["Persist the order snapshot with payment pending"]
    Order --> Form["Release one encrypted form for the attempt"]
    Form --> Gateway["Browser submits form to CCAvenue"]
    Gateway --> Callback["Payment API validates the return"]
    Callback --> Record["PostgreSQL reconciles the response with the stored order"]
    Record --> History["Customer reads recorded status in order history"]
    Order -->|Return missing or interrupted| History
```

An online order exists before the browser leaves for CCAvenue. Its snapshot preserves the agreed line items, total and reference for reconciliation. While that order is pending, the customer can read its stored status without creating a second payment attempt.

- If a price, size or availability changes, checkout asks the customer to review the cart again, even if its total is the same.
- If the browser loses the response after the form has been released, checkout returns the existing unresolved reference and withholds a second form. The same identity can check order history while the gateway result is reconciled.
- If the gateway repeats an accepted response, the database recognizes the stored receipt and leaves the purchased cart quantities alone.
- If any part of settlement fails to persist, PostgreSQL rolls back the receipt, payment state and related cart changes together. A later valid response can retry reconciliation.

[Checkout handler](server/checkout.js) · [Callback handler](server/payment.js) · [Payment lifecycle and recovery](docs/payment-lifecycle.md)

## Architecture

```mermaid
flowchart LR
    Browser["React storefront and staff workspace"]
    Auth["Supabase Auth"]
    Storage["Supabase Storage"]
    Policies["Supabase Data API and row-level security"]
    DB[("Supabase PostgreSQL")]
    API["Node.js APIs"]
    Gateway["CCAvenue"]
    Fixture["Loopback test fixtures"]
    Browser -->|Sign in and get a session| Auth
    Browser -->|Read images and upload as staff| Storage
    Browser -->|Catalog, carts, orders and reviews| Policies
    Policies -->|Apply policies to row access| DB
    Browser -->|Checkout quote, token and order lookup| API
    API -->|Validate bearer token on customer and staff routes| Auth
    API -->|Run privileged checkout and settlement functions| DB
    API -->|Return encrypted payment form| Browser
    Browser -->|Submit hosted payment form| Gateway
    Gateway -->|Return payment response| API
    Fixture -.->|Emulate Auth, Data API and gateway| Browser
    Fixture -.->|Inject local identities and database| API
```

React handles browsing, cart interaction and presentation. For direct browser queries, grants and row-level security (RLS) constrain what the current Supabase identity can access. The Node.js API validates that identity for private routes and derives the owner from the session. Its service client can bypass RLS, so explicit owner and staff checks matter on that path. Merchant credentials and privileged database settings stay on the server.

| Technology | Role |
| --- | --- |
| React, React Router and Vite | Render the storefront and staff screens, handle navigation and build the frontend. |
| Supabase Auth, PostgreSQL and Storage | Issue identities, enforce data access and persist business records and product images. |
| Node.js and CCAvenue | Prepare encrypted gateway requests, validate callbacks and return stored order status. |
| Vitest, Playwright, PGlite and native PostgreSQL | Test handlers, browser flows, SQL policies and concurrent transactions with local fixtures. |

The database calculates prices in paise from the current catalog and compares the entire quote before releasing a form. Persisting that quote ties the eventual payment to the original purchase even when catalog prices change. Settlement groups the receipt, order state and cart reconciliation in one transaction so they cannot disagree after a partial failure. Order lookup uses the recorded owner even when a customer has the payment reference.

## Data model and payment logic

Supabase Auth identities map to entries in `public.users`. Products carry prices, discounts and available sizes. Cart rows track owner, product, selected variant and quantity. Orders keep a line-item snapshot so history can display the agreed quantities and prices. Product reviews, contact enquiries and newsletter subscriptions have their own tables. Gateway receipts, response events and staff cash collection actions are stored in the private schema.

`open_store_checkout` locks the customer's checkout and compares the quote with the current basket. `record_store_response` binds the callback to the stored gateway reference and passes the payment evidence to the settlement function. Unique references, row locks and atomic writes protect retries and concurrent requests. COD uses the same pricing checks and records an unpaid order. `collect_store_cod` records the staff actor and receipt when cash is collected.

[Schema bootstrap](supabase/bootstrap/empty-project.sql) · [Checkout migration](supabase/migrations/20261122174027_checkout_integrity.sql) · [Access policies](supabase/migrations/20261030203438_production_security.sql)

## Testing

The local results below were verified on November 23, 2026 with Node.js 24.22.2 and npm 11.19.1.

Install Chromium with `npx playwright install chromium` before running the browser suite. On Linux CI, the workflow uses `npx playwright install --with-deps chromium` to install the system dependencies as well. Stop the preview first so port 4173 is free.

| Command | What it verifies | Local result |
| --- | --- | --- |
| `npm test` | Handler behavior, SQL policies via PGlite, access control and component behavior | 49 passed |
| `npm run test:postgres` | Native PostgreSQL races, callback retries and transaction rollback | 15 passed |
| `npm run test:e2e` | Storefront flows, account isolation, checkout recovery and simulated gateway responses | 15 passed |
| `npm run build` | Vite production bundle | Passed |

`npm run check` combines the source secret scan, Vitest, native PostgreSQL tests, build and runtime dependency audit. The browser tests use an isolated identity service, synthetic records and a payment simulator. [Verification workflow](.github/workflows/verify.yml) · [Test evidence](docs/engineering-audit.md)

## Common Engineering Questions

### 1. How do the frontend, backend and database communicate?

React uses Supabase for sign-in, catalog reads and permitted actions such as editing a cart. For checkout and payment status, React calls the Node.js API on the same site. The API verifies the caller and invokes restricted PostgreSQL functions. The storefront uses the order status saved by the backend, so a failed request can be retried without guessing whether payment succeeded.

### 2. Can customers shop without creating an account?

Yes. Visitors can browse and keep a cart in their browser without registering. When a guest starts checkout, Supabase can create an anonymous identity that owns the order. That identity can be upgraded during account setup. A guest who signs into a different account can carry over the cart, while any earlier orders stay with the identity that placed them.

### 3. How are products, shopping carts and orders stored?

PostgreSQL stores a product's current price, discount, availability and size options. Each saved cart row records the customer, product, selected size and quantity. Orders keep a snapshot of the purchased lines and amounts, along with separate payment and fulfilment statuses. Later catalog edits therefore leave the original purchase intact.

### 4. What happens if a product price or size changes during checkout?

The database compares the cart the customer reviewed with the current products, selected sizes, quantities and prices. A changed line can invalidate the quote even when the total stays the same. If the quote no longer matches, checkout asks the customer to review the cart again before issuing a payment form.

### 5. Why is the final price verified on the server?

The amount displayed in the browser is a quote for the customer. PostgreSQL calculates the amount from stored product prices in paise and saves it with the order. The server uses that amount for the gateway request. When the payment response arrives, a different reported amount cannot settle the order.

### 6. How does GCMT Shop integrate with CCAvenue?

When online checkout is enabled, the server creates an encrypted form using the stored order reference, amount and shipping details. The browser submits it to CCAvenue. The payment endpoint decrypts the response, checks the expected fields and asks PostgreSQL to reconcile it with the stored order. Missing or invalid fields stop reconciliation. The live merchant contract still requires staging verification. [Payment lifecycle](docs/payment-lifecycle.md)

### 7. Does opening the payment success page mean the payment succeeded?

The confirmation page looks up the order using the current session and order reference. It shows payment as successful only when the stored order has a paid status. If the gateway response has yet to be recorded, the order can still show as pending. Another customer's reference cannot retrieve that customer's order.

### 8. What happens if CCAvenue sends the same payment response twice?

PostgreSQL locks the order and compares the incoming result with its recorded receipt. It can record a matching repeat as a duplicate without removing any more items from the cart. The unique tracking reference also prevents one gateway capture from settling two orders. Conflicting evidence can be flagged for review.

### 9. What happens if a customer closes the browser during checkout?

The customer can return with the same identity and check the order status. If the server never released the prepared form, a new checkout action can recheck the cart. Once a form has been released, the server returns the existing order reference while it remains unresolved. That avoids issuing a second payable form when the first may have reached CCAvenue.

### 10. Why are PostgreSQL transactions important for payments?

A successful reconciliation records the receipt, marks the order paid, updates the purchased cart rows and writes a payment event in one transaction. If a write fails, all of those changes roll back together. A valid response can then be retried without leaving the order paid but missing its receipt or applying the cart change twice.

### 11. How are customer records and admin features protected?

Supabase row-level security limits which rows a customer's session can read or change. The staff interface checks the user's stored role, and database policies enforce staff permissions on direct requests. Since the Node.js service client can bypass those policies, API handlers verify the session and explicitly check the order owner or staff role before granting access.

### 12. How does cash on delivery work?

When COD is enabled, checkout verifies the cart and price, then saves a cash-due order and removes the purchased cart items in one transaction. Eligible orders can later be marked collected by an authorized staff member who provides a receipt reference. The database records who collected the cash and keeps that event separate from online gateway receipts.

### 13. How does the website generate and validate PDF invoices?

The browser builds the invoice from the stored order snapshot and escapes order text before rendering it. It checks in paise that each unit price multiplied by its quantity matches the stored line total, then compares their sum with the stored order total. If the values are missing or inconsistent, invoice generation stops for review.

### 14. How was the application tested without charging real money?

The browser tests run the built app against local identities, synthetic orders and a simulated gateway. Vitest covers handlers and database policies, while native PostgreSQL tests exercise concurrent writes, duplicate responses and rollback. The simulator verifies how the application reacts to controlled payment responses. Live CCAvenue processing and hosted database configuration still need staging validation.

## Current status and limitations

The checked-in checkout flow was verified locally against synthetic services. The commercial storefront used an earlier payment integration when it was inspected on November 23, 2026. The simulator verifies application behavior under controlled responses. Merchant acceptance, hosted schema compatibility and the production cutover still require separate staging validation. [Deployment and recovery](docs/deployment.md)

## Project structure and documentation

```text
src/                  Storefront, customer account and staff screens
api/                  Same-origin HTTP entry points
server/               Checkout, order lookup and payment handlers
shared/               Gateway settings shared by browser and server
supabase/             Database bootstrap, migrations and local configuration
scripts/              Local preview and verification commands
tests/                Handler, database and browser regression suites
docs/                 Technical guides, review evidence and deployment notes
```

- [Checkout and payment lifecycle](docs/payment-lifecycle.md)
- [Database and security review](docs/engineering-audit.md)
- [Common engineering questions](#common-engineering-questions)
- [Testing and verification](#testing)
- [Deployment, staging and recovery](docs/deployment.md)

## Attribution

Application development by Ved Patel and the contributors recorded in Git history. GCMT Herbal branding and commercial product imagery belong to Gold Coin Multi-Trade Private Limited or their respective rights holders. Third-party libraries retain their own licenses.
