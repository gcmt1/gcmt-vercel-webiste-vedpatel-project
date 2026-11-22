# Engineering questions

1. **Why send the displayed price when the server prices the cart?** The display is the customer's quote. `server/checkout.js` passes it to `open_store_checkout`, which calculates from locked product records and compares each line and the total. Product changes require another review. The cart does not reserve inventory.

2. **Who identifies the customer?** `authenticate` in `server/services.js` calls Supabase Auth with the bearer token. The derived user ID scopes the order. An expired session requires signing in again, including for order lookup.

3. **How does an order reach CCAvenue?** `server/checkout.js` encrypts the stored reference, verified amount and shipping fields, claims a generation, then returns a form destination from `shared/gateway.js`. `CheckOut.jsx` submits it only after an explicit customer action. The merchant must confirm fields, URLs and lengths in its sandbox.

4. **Why use two database steps for handoff?** `open_store_checkout` persists a prepared quote. `release_store_handoff` consumes a single generation just before response delivery. A crash during preparation is recoverable without issuing two forms. The network cannot establish whether the final HTTP response reached the customer.

5. **Can two tabs create two payable orders?** The owner profile lock serializes checkout even across distinct UUIDs. An issued unresolved attempt returns its existing reference. Native tests in `tests/postgres/checkout.mjs` race distinct connections. Separate customer identities remain independent.

6. **What makes a callback acceptable?** `createPaymentHandler` validates the encrypted form, merchant, currency, status and tracking fields. `record_store_response` checks the exact reference and delegates the monetary comparison to `record_gateway_payment`. The provider's approved response samples are outstanding.

7. **How are repeated successes handled?** `record_gateway_payment` locks the order and compares its receipt. The receipt has unique payment and tracking references. A duplicate cannot repeat cart consumption. A database rollback permits a subsequent genuine callback to succeed.

8. **What happens when evidence conflicts?** The integrity migration records dispositions in `private.gateway_events`. An accepted success is protected against downgrade. A compatible delayed success may upgrade a failure. Merchant investigation is required for contradictory references or evidence after closure.

9. **What happens if the customer closes the browser?** `PaymentSuccess.jsx` and `server/orders.js` read the stored owner-scoped result on return. A retained prepared generation can be requoted. A released form remains potentially payable until reconciled. The browser never certifies settlement.

10. **When may support unlock a fresh attempt?** `close_unpaid_store_attempt` requires a merchant case and is restricted to the database operator. The evidence must establish final non-payability. A customer timeout, local timer or failed page navigation is insufficient.

11. **Where does a guest cart live?** `src/utils/cart.js` stores product IDs, quantities and sizes locally before identity creation. On merge, stable operation UUIDs and the cart RPC protect retried additions. Losing browser storage before merge loses that local basket.

12. **Does account conversion preserve orders?** `AuthPage.jsx` updates the anonymous identity before email confirmation and password setup. This can retain the same user ID. Logging into a different existing account can transfer basket lines, but ownership policies continue to bind historic orders to their original identity. Confirm the actual email flow in staging.

13. **Why keep admin routes and database policies?** `RequireAdmin.jsx` gates the interface. The October migration grants only permitted commands and uses `private.is_store_admin` for direct API access. The hosting route itself cannot establish database authorization.

14. **What is the service-role boundary?** `server/services.js` constructs the privileged client server-side. `vite.config.js` exposes named public fields only. This role can bypass RLS, so owner predicates, admin checks and control of every deployed writer remain essential.

15. **Which changes must commit together?** Order creation and its snapshot, the COD basket removal, and the online receipt/payment/cart/event updates each require a transaction. See both migration files and the injected-journal-failure test in `tests/postgres/checkout.mjs`. Browser navigation is outside that transaction.

16. **How does settlement affect later cart edits?** The online snapshot identifies the purchased cart row and variant. A matching row is removed or reduced once. A replaced row, smaller current quantity or legacy item with unknown row identity is preserved. The customer can review residual items.

17. **How is COD collection represented?** `collect_store_cod` checks the actor's database role, locks the COD order and records a collection note. A gateway callback cannot collect cash. Owner approval is still needed for which new orders qualify for COD.

18. **How are catalog images controlled?** `AdminProductManager.jsx` and `src/utils/images.js` check size, allowed media type and file headers. The October migration restricts bucket writes by role and configures bucket limits. A real Storage upload and CDN read are staging checks.

19. **Why sanitize CSV and invoice data separately?** `src/utils/security.js` quotes and neutralizes spreadsheet formula cells. `InvoiceGenerator.jsx` escapes text before HTML rendering, validates stored money and uses the PDF renderer. Export tests cover both formats. Financial and tax approval remains separate.

20. **What distinguishes unit, database and browser evidence?** Handler tests inject database results. PGlite executes policies against fixture roles. `tests/postgres/checkout.mjs` uses independent native database connections. Playwright exercises the built SPA and local handlers. None authenticates to the actual merchant or hosted Supabase instance.

21. **How is staging isolated?** `scripts/check-environment.mjs` and `server/environment.js` check project targets, server-only settings and production repository/branch context. The operator must verify independent staging resources, callbacks and identity redirects. A repository guard cannot enumerate every production project alias.

22. **What if a migration fails?** Each migration has its own transaction. A later failure can leave an earlier migration committed. Keep checkout paused, record the exact migration state and compare the restored staging schema and current receipts. The coordinated recovery procedure is in `docs/deployment.md`.

23. **What signals matter during reconciliation?** `private.payment_review_queue`, receipt uniqueness, order age, event dispositions and inquiry exhaustion distinguish missing from conflicting evidence. `server/reconciliation.js` needs an approved merchant transport and an operator before it can recover actual transactions.

24. **Why does the release remain blocked?** The public bundle and selected source have different payment architectures. `docs/engineering-audit.md` records the branch evidence, historical credential exposure and outstanding merchant, database and business checks. The next integration decision requires the owner to identify the active writer and deployed schema.
