# GCMT Shop engineering audit

**November 23, 2026 · Production release BLOCKED**

The isolated candidate can price and settle synthetic orders under concurrent PostgreSQL sessions, recover a checkout that never released a gateway form, and preserve customer access to recorded orders. A public bundle observed during the earlier audit contained a different payment integration. Promoting this branch would change the order writer, gateway return contract, database policies and COD workflow. No production account, payment, database operation, merchant setting or deployment was used for verification.

## Baseline and previously observed deployment topology

The hosting, GitHub and commercial-origin observations below date to the earlier audit. The final handoff verified local Git objects and ran isolated tests. The serving deployment and active payment writer still require confirmation from their owners.

| Surface | Direct observation | Interpretation |
| --- | --- | --- |
| Source under review | `origin/master` and baseline commit `ee2044d3fbf9479f3f740bb4586a7c8f93c4d072`, 132 tracked paths. GitHub default and a Preview deployment. GitHub Actions reports one successful run for this exact SHA. | Chosen because it contains the APIs, October migration and tests. Production branch **UNVERIFIED**. |
| Legacy source | `origin/main` at `e5e4c236e1689862ce41f9226791e3f89020e8a7`, 106 paths. Merge base `27e264629ed23485af314590063a39271e8366c8`. Main has 27 exclusive commits, master 18. | CRA frontend, external payment service, browser order writes, COD and a separate Edge Function. No merge performed. |
| Static publication | `origin/gh-pages` at `b9179c34f298a508c568ef0dff2314b6e993e48b`, 35 paths. GitHub records a Pages deployment. Its entry is `main.928d366a.js`. | A built site with its own history. It cannot serve the candidate Node handlers by itself. |
| Commercial origin | Public HTML at `gcmtshop.com` resolved to the www storefront. Asset `/static/js/main.7106b868.js`, 1,152,660 bytes, SHA-256 `30781699ad3eeed321dd15921eb12b844a29c1043f0a65dc1b5b70d6be5f4361`. | The delivered code contains the external service host `gcmtshop-cca-backend-kappa.vercel.app`, paths `/api/createOrder` and `/api/paymentResponse`, COD text and COD_PENDING. The two modern payment paths were absent. No buttons were pressed on the live site. Current merchant routing, COD eligibility and service operation remain unknown. |
| Database relationship | The public bundle contains the same Supabase origin found in master's historical public defaults, main's client and gh-pages configuration. | Confirms shared public configuration. It does not identify deployed policies, server-side project targets, active writers, accessible data or credential validity. |
| Historical production | Latest Production-labeled GitHub deployment returned was `6148531821`, status success, `6ca392f8886aea26752066aa2ba276c0eb82d795`, August 28 UTC. Three historical deployment URLs checked did not yield the observed storefront entry marker. | The exact deployment serving the custom domain, current hosting project/branch and possible independent repository remain **UNVERIFIED**. |
| Local implementation | Local branch `fix/gcmt-checkout-integrity` without upstream. Single GitHub remote. At final review the index matched the baseline. The working tree contained 56 tracked modifications, two tracked deletions and 17 new files. | The incoming patch reconstructed the complete source tree. Baseline test counts below come from the earlier clean snapshot. Other workspace repositories were left alone. |

GitHub reports PR 1 merged into master on October 30 UTC at `9368de8e6351c072ef4db9c8b4f28616e49c97bf`. The earlier audit recorded branch, deployment and static asset evidence. [Repository](https://github.com/gcmt1/gcmt-vercel-webiste-vedpatel-project) · [Merged change](https://github.com/gcmt1/gcmt-vercel-webiste-vedpatel-project/pull/1) · [GitHub deployment records](https://api.github.com/repos/gcmt1/gcmt-vercel-webiste-vedpatel-project/deployments) · [Storefront](https://www.gcmtshop.com/)

## Findings register

“Confirmed” means observed in a Git object, public asset or isolated execution. “Potential” identifies an additional condition required for harm. “Operationally unverified” requires evidence from the service owner. Fixed statuses below apply to the isolated candidate. Paths and function names identify the reviewed implementations. **Integrity SQL** refers to `supabase/migrations/20261122174027_checkout_integrity.sql`; **October SQL** refers to `supabase/migrations/20261030203438_production_security.sql`.

### Confirmed

| ID / severity | Component and observed cause | Expected behavior, impact and remediation | Regression evidence / status |
| --- | --- | --- | --- |
| SEC-01 · high | Reachable history contains private mail-service key material and a merchant working-key literal. | Private service credentials require provider-controlled custody. Historic copies could permit unauthorized use if active. Follow the rotation assessment below. | Reachable Git objects inspected privately. Provider revocation evidence required. **Blocked** |
| PAY-01 · high | Main `src/pages/CheckOut.jsx` builds and inserts browser-supplied order records. Main `supabase/functions/verifypayment/index.ts` updates by parsed order ID without matching saved amount, currency and receipt. | Only one authorized writer should create/settle orders. Do not grant legacy browser writes to make the modern schema compatible. Inventory and retire or isolate old writers under owner control. | Candidate RLS and handler tests deny browser authority. Legacy deployment exposure unknown. **Partially fixed** |
| PAY-02 · high | Baseline `server/checkout.js` performed lookup, basket read and insert separately. Different attempt IDs could represent one purchase. Baseline `src/pages/CheckOut.jsx` retained an ID only for the mount. | A buyer should get one handoff at their confirmed price. Owner lock, complete price/size comparison, prepared generation and single release now separate recoverable preparation from uncertain gateway delivery. | `tests/postgres/checkout.mjs`, handler and browser suites cover concurrency, re-quote and lost response. **Fixed** |
| PAY-03 · high | October SQL froze the first failure receipt; an already-paid legacy order without a receipt could accept a success without matching its tracking evidence. Baseline cart cleanup keyed only on product and owner. | Match reference, amount, tracking and state, settle once and protect later basket edits. Integrity SQL journals conflicts, handles compatible late success and consumes identifiable purchased rows only. Unknown legacy cart shapes stay intact. | Native concurrent captures, duplicate/late conflicts, rollback and legacy-snapshot tests. **Fixed** |
| PAY-04 · high | Baseline `server/checkout.js` hardcoded the live gateway; pre-existing candidate handlers could initiate while callback acceptance was off. `server/payment.js` allowed omitted merchant identity. | Send only to the intended environment and require usable callback evidence. Independent intake switches, merchant checks, exact stored reference and explicit production branch binding now fail closed. Provider field availability remains a release gate. | `tests/server/handlers.test.js`, `tests/postgres/checkout.mjs`, build checks. **Fixed** in candidate contract |
| PAY-05 · high | Legacy customer COD exists; baseline `CheckOut.jsx` exposed online checkout only. `server/orders.js` managed historical COD. | Preserve COD parity without a browser order insert. New gated path snapshots the verified basket, creates COD_PENDING and records staff collection separately. | Mobile COD through order history and PDF download, cancelled COD with missing total, native parallel creation and admin collection tests. Business rollout **needs verification** |
| DATA-01 · high | October SQL and baseline `AdminOrder.jsx` permitted staff deletion of orders. Paid history could disappear. | Archive the order, retain the receipt/customer history, audit actor and transitions and restrict payment writes. Integrity SQL and staff screens implement this. | PostgreSQL role, archive and COD tests. Operational retention policy **needs verification** |
| DATA-02 · medium | Baseline `src/utils/cart.js`, `useCart.jsx` and the owner/product index collapsed variants and relied on read-modify-write. | Preserve selected sizes, protect merges against retries and update a customer's own current quantity. Variant key, operation IDs, row checks and re-quote protect the candidate path. | Guest-size browser test and concurrent merge SQL tests. **Fixed** |
| SEC-02 · high | `src/config/public.js` supplied commercial project defaults. Build-time prefix exposure and a fixed assumed production branch complicated isolation. | Require explicit public configuration, allow only exact frontend names and verify production repo/branch context. Guard the known commercial host and scan candidate/build artifacts. | Environment tests, source and build scan. Project aliases and hosting overrides still require operator review. **Partially fixed** |
| FIN-01 · medium | `InvoiceGenerator.jsx` recalculated invoice totals and implied a zero tax rate. `AdminOrder.jsx` summed items, including unpaid orders, into revenue. | Use recorded totals, hold inconsistent invoices, show unavailable tax breakdown and aggregate recorded paid orders only. Keep legacy text snapshots readable. | Rendering/arithmetic tests, real browser PDF download, `src/utils/orders.js`. Approved invoice rules **needs verification** |
| UX-01 · medium | Baseline `PaymentCancel.jsx` used a missing image and stated that no charge occurred. Confirmation and history must remain tied to owner and recorded state. | Use neutral status guidance and distinct confirmed, unpaid COD and pending views. History resets on identity change. | Browser owner/pending/COD checks and status route smoke. **Fixed** |
| UX-02 · medium | `Navbar.jsx` discarded search input and ignored guest counts. `ProductListings.jsx` showed no actionable fetch error. `BlogPage.jsx` displayed placeholder reading/pagination links and an inert signup form. | Carry a query in the URL, show results/errors, synchronize basket count and reuse the working newsletter path. Remove actions without a content destination. | Search error and guest badge tests, visitor signup and admin inbox test; blog route smoke. **Fixed** |
| UX-03 · low | `index.html` restricted zoom; `public/manifest.json` used CRA labels; `public/sitemap.xml` advertised an unverified example slug; `src/App.jsx` had a fixed year. | Allow zoom, identify the store, publish known listing routes, and retain attribution pending rights verification. Shipping labels, review editing and order-dialog keyboard controls also improved. | Static diff, keyboard/mobile browser exercises. Complete assistive-technology audit outstanding. **Partially fixed** |
| PERF-01 · medium | Baseline catalog cards refetched supplied product rows and imported a 2,545,875-byte logo. The entry bundle included admin code. | Reuse fetched rows, use a 52,218-byte logo and defer staff routes. PDF export still loads a roughly 610 kB minified chunk on demand. | `ProductCard.jsx`, `src/App.jsx`, Vite builds. Artifact sizes measured; field Web Vitals unavailable. **Partially fixed** |
| OPS-01 · high | `server/reconciliation.js` has a tested worker interface, but there is no configured merchant inquiry transport or scheduler. | Recover interrupted payments from independent evidence before permitting a new charge. Use the private queue and staffed reconciliation until an approved integration exists. | Fixture inquiry and native claim tests. Provider transport and operating coverage **blocked** |

### Potential

| ID / severity | Component and evidence | Expected behavior, impact and remediation | Regression evidence / status |
| --- | --- | --- | --- |
| DATA-03 · high | Integrity SQL checks catalog availability for one basket. No shared stock reservation/decrement is present. | If stock is a finite sellable count, simultaneous buyers could overcommit it. Establish catalog semantics, hold expiry and fulfilment rules before adding inventory accounting. | Price/variant concurrency tested; cross-buyer inventory policy requires business fixtures. **Needs verification** |
| DATA-04 · medium | `src/pages/AdminOrder.jsx`, `AdminSubscription.jsx`, `AdminContactForm.jsx` and `ProductListings.jsx` fetch collections; staff filters/pagination operate on returned rows. | Hosted row caps can omit records and make totals/exports incomplete. Determine volumes and use stable server-side pagination and export boundaries before relying on whole-store totals. | Small-fixture routes and export pass; high-volume hosted limits untested. **Needs verification** |
| UX-04 · medium | `HomePage.jsx`, `ProductListings.jsx`, `BlogPage.jsx` and `TnC.jsx` contain marketing, medical, audience and delivery claims; checkout models zero separate freight. | Obtain authorized evidence for claims, attribution and freight/tax rules. Published copy and delivered prices need to agree. No certification or policy was inferred. | Content-owner/finance sign-off required. **Needs verification** |
| SEC-03 · medium | Integrity SQL submission limits are per email digest or account. Guest localStorage merging uses Web Locks where available. | Multiple identities may bypass volume controls; cross-tab writes without Web Locks can race. Verify abuse limits, CAPTCHA/edge controls and supported browsers. | Native merge and RLS tests cover defined keys. Deployment/browser coverage **needs verification** |

### Operationally unverified

| ID / severity | Evidence gap and file references | Expected outcome, impact and required remediation | Verification / status |
| --- | --- | --- | --- |
| OPS-02 · high | Public asset markers differ from `vercel.json` and `api/create-order.js`; provider callback registrations and active legacy Edge Function are inaccessible. | Map live alias, commit, both origins and exactly one writer per reference before cutover. An incorrect mapping can abandon charges or duplicate payment writes. | Read-only evidence above; owner and merchant inventory **blocked** |
| OPS-03 · high | October SQL replaces policies/grants; Integrity SQL changes uniqueness, function privileges, statuses and archive behavior. Hosted schema, roles, existing data and restore capability unavailable. | Compare actual constraints, grants, triggers, personal-data columns and storage configuration. Rehearse migrations and restore on isolated representative data. | PGlite/native fixtures pass. See the compatibility checklist in `docs/deployment.md`. **Blocked** |
| OPS-04 · high | `server/ccavenue.js`, `server/payment.js`, `shared/gateway.js` and auth/storage configuration have no merchant-issued sandbox evidence or hosted staging execution. | Confirm merchant field contract, amount/identity guarantees, cancellation, callback URLs, identity redirects, email delivery and bucket behavior on authorized services. | Synthetic success/failure/replay tests and local auth fixtures only. **Blocked** |

## Confidential exposure assessment

All 293 unique reachable Git blobs across 70 commits were privately inspected with patterns for mail keys, merchant assignments, privileged database tokens and private keys. Inspection included built JavaScript and maps. A pattern hit on an empty example was checked against the blob and excluded. The check identifies recognized formats only. No credential was tested.

The local history scan confirmed mail-service key material, a merchant working-key literal and legacy public client configuration. The rotation and revocation status of the historical credentials is unknown. The mail and merchant owners must identify affected accounts privately, review activity, coordinate key retirement with outstanding payments, and retain confirmation. Public database client keys also require effective access policies. A clean candidate tree cannot retire an issued credential.

## Customer and staff feature parity

| Journey | Legacy main / baseline master | Candidate evidence and remaining boundary |
| --- | --- | --- |
| Home, catalog, search and product detail | Both show catalog; baseline search discarded input and cards repeated fetches. | Home, product, search, empty/error and variant paths exercised locally. Large-catalog pagination and real CDN performance unverified. |
| Prices, stock, cart add/change/remove | Legacy client snapshots prices; baseline server-priced online checkout lacks atomic read/insert and size-aware cart identity. | Native pricing, invalid/empty basket, same-total size substitution, quantity changes and mobile guest persistence covered. No stock reservation. |
| Registration, login, guest identity and conversion | Legacy has guest identifiers; baseline modern Auth uses anonymous users and RLS. | Failed/successful anonymous basket transfer tested, local anonymous signup exercised. Actual email link, conversion, recovery and provider rate limits require hosted staging. |
| Checkout and gateway redirect | Legacy external backend and customer COD. Master same-origin online only. | Explicitly confirmed quote, serialized online handoff and optional server-authoritative COD. Browser form goes to a local intercepted gateway in tests. |
| Return, interruption, cancellation, retry | Legacy return depends on external writer; baseline repeated ID returns 409. | Separate unissued/released states, verified owner lookup and neutral cancellation. Native concurrency plus callback matrix exercised. No merchant sandbox. |
| Order history, details, PDF, tracking | Both display orders; legacy may have different status/ID/snapshot forms. | Browser tests download PDF and close detail dialog with keyboard; recorded tracking reference shown. Historic invoice and retention policy remain open. |
| Reviews | Both expose ratings and customer text. | Role fixtures and actual browser submission/edit/deletion pass. Staff removal is covered by policy. |
| Contact/newsletter/content | Both have contact and signup UIs; baseline blog signup suppressed submission. | Visitor submissions appear in staff inboxes. CSV download tested. Blog/category filters use static excerpts; article destinations require approved content. |
| Mobile and desktop navigation | Both have responsive layout. | Mobile keyboard navigation to COD and desktop route checks run on Chromium. Other browsers/assistive technologies unverified. |
| Staff products, images and orders | Legacy browser admin operations; baseline admin route plus RLS. | Product manager route, role boundaries, image headers, archive/collection and fulfilment checks exercised. Real storage/CDN and production record compatibility unverified. |
| Exports and staff totals | Staff contact/subscriber exports and order filters in both trees. | Formula-safe CSV, paid-only stored totals, live customer/history and staff separation tested locally. Bulk/high-volume exports and finance policy unverified. |
| Hosting | CRA/static gh-pages and separate API versus Vite/Vercel functions on master. | Candidate needs a function-capable host, scoped browser keys and updated SQL. Static publication alone cannot run checkout. |

## Database boundaries exercised

| Object | Source permission model | Local evidence and remaining check |
| --- | --- | --- |
| Auth and public users | Auth trigger creates a normal profile. Authenticated users read their own profile, staff can read others, browser roles cannot assign privileges. | Fixture signup, metadata and stale-column-grant tests. Inventory all existing auth triggers and staff roles in staging. |
| Products and product-image | Public catalog reads, staff catalog writes. Restrictive Storage policies protect uploads, replacements and deletion for this bucket. Other buckets retain their own rules. | Database role tests plus UI header validation. The actual hosted bucket, CDN reads, MIME enforcement and object cleanup require staging. |
| Cart items and operation IDs | Owner-only rows and quantity checks. The add RPC deduplicates per account and operation. A basket line is unique by owner, product and variant. | Race, merge, size and owner tests. Review historical cart rows with missing sizes before applying the index. |
| Orders and staff actions | Owner/staff reads. The service creates authoritative snapshots. Only permitted staff fulfilment/archive columns are writable from the browser. Physical order deletion is denied to browser roles. | Native ownership/collection/transition tests and local REST fixture checks. Inspect custom integrations and retained historic accounts. |
| Checkout limits, preparations, receipts, events, closure and inquiry schedules | Private objects, restricted RPC execution and transaction locks. Receipt payment ID is primary, tracking reference unique. Only a database operator can close an unresolved attempt after external confirmation. | Real concurrent connections and transaction-abort tests. Verify production service-key custody, queue staffing, monitoring, backups and journal retention. |
| Product reviews | Public read, bounded owner submission/edit, owner or staff moderation. | RLS tests and browser edit/delete show genuine owner workflows. Audit actual readable columns before enabling public SELECT. |
| Contact and newsletter | Bounded public insert. Staff read/delete. Per-identity rate limits and safe customer-text export. | PGlite and actual UI-to-inbox tests. Real abuse controls, duplicate subscription policy, consent and retention require owner review. |

## Payment validation matrix

| Case | Evidence | Result in the candidate |
| --- | --- | --- |
| Success, decline, customer abort, gateway Invalid | Handler cases and built-browser success flow | Exact matching success confirms. Recognized negative outcomes produce the failure path. |
| Malformed or duplicate encrypted fields, unexpected status, wrong merchant/currency, invalid amount, absent success tracking | Parser/handler and SQL policy tests | Invalid evidence does not produce a successful redirect or recorded capture. |
| Amount mismatch or different wire reference | Receipt SQL and native exact-reference tests | Saved payment amount and wire reference must match. Legacy format is limited to its corresponding saved order. |
| Duplicate/conflicting/delayed responses | Native duplicate, failed-then-success, tracking reuse and closed-attempt tests | One financial result, one cart reconciliation. Conflicts remain in the private event journal for authorized operators. |
| Database failure after partial work | Native forced journal-write failure | Rollback retains the pending order and cart. A later authenticated response can settle it. |
| Browser closes, network response lost or customer submits twice | Browser lost-response/refresh, native prepare/claim and two-tab tests | Reuse a proven unissued preparation or read the existing potentially payable order. |
| Changed catalog, empty/invalid basket, same-total substitution | Handler plus native price/availability, quote and COD tests | Reject changed or unsupported lines before issuing a form. |
| Different users, browser payment/status writes and unauthorized staff operations | PGlite role/column tests, native service RPC tests and browser owner lookup | Other customer data and financial state remain inaccessible in the tested roles. |
| COD creation, collection and duplicate request | Native two-connection COD, staff role/note and browser mobile/PDF tests | Record amount due, remove the purchased lines once, collect once and preserve an audit action. |
| Actual CCAvenue compatibility | Merchant-issued fixtures and hosted sandbox unavailable | **Blocked.** Local encrypted data exercises parser agreement only. |

## Verification and checkpoints

The CI workflow requests read-only repository contents, disables persisted checkout credentials and pins both actions by commit SHA. The lockfile contains no entries marked deprecated. Package maintenance and undisclosed vulnerabilities cannot be inferred from the advisory count. The native PostgreSQL runtime is a development dependency on a prerelease wrapper; CI platform compatibility still needs a run on the final candidate.

Baseline results are retained from the earlier audit of ee2044d. The final candidate column records the local handoff run on Node 24.22.2 and npm 11.9.0, using fresh locked dependencies, loopback fixtures and synthetic public settings. The test service implements a subset of the Auth and PostgREST APIs. Hosted projections, redirects, role grants, payment forms and merchant callbacks require separate staging evidence.

| Command / measure | Baseline | Final candidate |
| --- | --- | --- |
| Clean lockfile install, `npm ci --no-audit` | 172 packages installed | 189 packages installed from the local npm cache using the lockfile |
| `npm run format:check` | Pass | Pass |
| `npm run check` / Vitest | 37 passed in six files | 49 passed in six files, including RLS with real SQL in PGlite |
| `npm run test:postgres` | No native multi-connection suite | 15 passed on native temporary PostgreSQL; zero skipped |
| `npm run build` in the composite check | Pass | Pass; invoice export chunk still exceeds 500 kB |
| `npx playwright install chromium` / `npm run test:e2e` | Six passed | 15 passed, one worker, zero retries or skips. The browser intercepted the sandbox form. |
| `npm audit --omit=dev --audit-level=high` | Zero reported | Zero reported. Separate full-tree advisory check also reported zero. |
| `node scripts/check-secrets.mjs --build` | Build scan absent | Passed for candidate source and generated browser files |
| `npm run release:check` | No actual release configuration tested | Empty environment refused with exit 1; synthetic staging settings accepted. No service contact or production credentials. |
| Performance evidence | Logo 2,545,875 bytes; index JS 713.79 kB minified. | Logo 52,218 bytes. Admin chunks split. Initial navigation also needs the App and shared chunks; the smaller index alone does not measure total load. No production LCP, CLS or INP claim. |

An initial browser run encountered a response-body/navigation race in a test and competing builds with different COD visibility settings. The test now checks the actual intercepted gateway request; final verification runs the build-producing suites sequentially. Checkout form selectors were also scoped after the real newsletter field was introduced. The public store received no browser test traffic.

| Checkpoint | Changes and evidence | Payment effect / outstanding |
| --- | --- | --- |
| 1 · Baseline | Git refs, source topology, PR/CI metadata, public asset fingerprint, 37 unit/policy and six browser tests. | None. Live commit and merchant settings unknown. |
| 2 · Security | Environment isolation, explicit public fields, history and build scanning, callback identity checks. See SEC-01/02 and PAY-01/04. | Fail closed on wrong environment or missing merchant. Rotation and provider samples outstanding. |
| 3 · Checkout | `server/checkout.js`, payment handlers, Integrity SQL, cart/checkout UI and concurrency tests. | Changes initiation, recovery, callback and gated COD behavior. Needs staging and merchant approval. |
| 4 · Data and staff | Auth/cart, storage header checks, order retention, receipts, invoice and staff totals. Native and RLS tests plus browser PDF and CSV. | Preserves financial records; approval needed for migration, invoice and fulfilment rules. |
| 5 · Usability and performance | Catalog requests, compressed logo, route splitting, cart count, accessible shipping/review/order interactions, working search and newsletter. | Payment status copy changed; online and mobile COD flows exercised. Other browsers and field metrics pending. |
| 6 · Final | Full sequential regression, clean installs, advisory checks, build scan, checked source diff, documentation and deployment checklist. Individual paths and reasons are in the companion inventory. | No change to live configuration or data. Deployment blocked. |

## Local engineering handoff

The parent is `ee2044d3fbf9479f3f740bb4586a7c8f93c4d072`. It already contained the Vite storefront, same-origin checkout, payment-response and order APIs, server-side pricing, the October access policies and receipt function, CSV and invoice escaping, security headers and the original test suites. The candidate adds transactional quote comparison and handoff recovery, variant-aware cart operations, COD creation and recorded collection, archive and fulfilment rules, receipt conflict handling, and invoice arithmetic checks.

Applying the supplied patch to the parent in a separate index produced the incoming tree `49a54dda4c5d734be14fd59b51ddd78f5ecc9a8a`. The original patch and a separate archive of that tree are held outside the repository. The final handoff excludes the unused source-mirroring utility and retains the parent hosting policy. Only the loopback fixture substitutes the sandbox form destination. The final order-screen changes preserve missing amounts as unavailable and suppress active-delivery messaging for cancelled COD records.

The dedicated security command passed 47 tests in five files, overlapping the main Vitest count. An initial sandbox run could not bind the PostgreSQL or browser fixture ports. Both suites ran to completion with local loopback access. The credential and path checks covered source, documentation, browser output and handoff artifacts. They detect recognized patterns and exact historical material. Content-owner review remains necessary for inherited product claims, testimonials, attribution and published business contact details.

**Status.** Local engineering review complete. CI on the handoff commit, hosted integration evidence and owner authorization remain outstanding. The production release is blocked. See the [changed-file inventory](review-scope.md), [payment lifecycle](payment-lifecycle.md), [engineering questions](engineering-questions.md) and [staging and rollback gates](deployment.md).
