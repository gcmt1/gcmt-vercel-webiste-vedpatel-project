# Review scope and changed files

The file manifest covers the fetched branch tips and the isolated candidate on November 23, 2026. A path in the manifest establishes inventory coverage. Runtime evidence for a journey is recorded separately in the [audit](engineering-audit.md). Source-map and binary entries were inventoried; images and video were not treated as evidence of approved marketing claims.

## Implementation diff

The incoming candidate changed 75 paths relative to the baseline. The local handoff changes 73. It excludes a repository-comparison utility and the proposed hosting policy edit. Both are preserved in the independent incoming snapshot. A means added, M modified and D removed.

| Change | Path | Purpose |
| --- | --- | --- |
| M | `.env.example` | Document or enforce explicit checkout flags, public project configuration, deployment identity and owner-verified production branch. |
| M | `.github/workflows/verify.yml` | Retain read-only pinned verification actions, use the declared npm version and check the built browser files. The inherited candidate adds main to the verification-only push filter. |
| M | `README.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| M | `docs/deployment.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| A | `docs/engineering-audit.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| A | `docs/engineering-questions.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| A | `docs/payment-lifecycle.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| A | `docs/review-scope.md` | Provide setup, scoped findings, operating decisions, payment behavior, release gates or file-level review evidence as named. |
| M | `index.html` | Restore zoom, remove fixed analytics injection and keep public entry metadata. |
| M | `package-lock.json` | Lock the native PostgreSQL test runtime and client, add the concurrency suite to check, and provide a fixture review command. |
| M | `package.json` | Lock the native PostgreSQL test runtime and client, add the concurrency suite to check, and provide a fixture review command. |
| M | `playwright.config.js` | Expose COD in the local fixture browser build so the permitted/denied server paths can be tested. |
| M | `public/404.html` | Provide a usable static fallback with a storefront link. |
| D | `public/analytics.js` | Move optional analytics setup to an explicitly configured entry and provide the missing-configuration view. |
| M | `public/manifest.json` | Replace generic app labels or the example product URL with identified storefront information. |
| M | `public/sitemap.xml` | Replace generic app labels or the example product URL with identified storefront information. |
| M | `scripts/check-environment.mjs` | Document or enforce explicit checkout flags, public project configuration, deployment identity and owner-verified production branch. |
| M | `scripts/check-secrets.mjs` | Include untracked candidate source and optional generated browser files in redacted signature checks. |
| A | `scripts/review.mjs` | Inherited tool to serve the built storefront against isolated fixture records with checkout disabled. |
| M | `server/checkout.js` | Authenticate, validate the confirmed quote, handle gated COD and release only the current database-claimed online handoff. |
| A | `server/environment.js` | Document or enforce explicit checkout flags, public project configuration, deployment identity and owner-verified production branch. |
| M | `server/http.js` | Permit a caller-selected bounded JSON body size for multi-line quotes. |
| M | `server/orders.js` | Bind receipt lookup to owner and reference, including new COD references; require a staff role and collection note. |
| M | `server/payment.js` | Require the configured merchant, gateway environment and exact saved wire reference before atomic receipt processing. |
| A | `server/reconciliation.js` | Validate independent merchant inquiry evidence and use the same receipt transaction; transport unconfigured. |
| A | `server/reference.js` | Preserve UUID identity across the candidate wire reference and centralize allowed gateway destinations. |
| M | `server/services.js` | Apply database target checks before opening a privileged client. |
| M | `server/validation.js` | Retain shipping/reference/currency validation and remove obsolete JavaScript catalog pricing after moving pricing into SQL. |
| A | `shared/gateway.js` | Preserve UUID identity across the candidate wire reference and centralize allowed gateway destinations. |
| M | `src/App.jsx` | Defer staff route modules, add an accessible missing-route page and remove the fixed copyright year while retaining attribution. |
| A | `src/assets/GCMT-logo.webp` | Use the compressed version of the existing store logo. |
| M | `src/components/AddToCartButton.jsx` | Carry size through adds and merges, use atomic operation IDs and bound cart quantities. |
| M | `src/components/Footer.jsx` | Share real newsletter submission and feedback across both entry points; remove placeholder blog actions lacking destinations. |
| M | `src/components/InvoiceGenerator.jsx` | Normalize historical item shapes, verify arithmetic and recorded totals, safely render PDF data and compute paid staff totals. |
| M | `src/components/Navbar.jsx` | Propagate search terms, share authenticated identity and reflect current guest/owner cart quantities. |
| A | `src/components/NewsletterForm.jsx` | Share real newsletter submission and feedback across both entry points; remove placeholder blog actions lacking destinations. |
| M | `src/components/ProductCard.jsx` | Reuse supplied product data and display available sizes, stock, images and ratings consistently. |
| M | `src/components/ReviewSystem.jsx` | Support keyboard ratings, reliable edit focus, bounded text, staff moderation and mutation feedback. |
| M | `src/components/ScrollToTop.jsx` | Honor catalog search anchors during client-side navigation. |
| D | `src/config/public.js` | Remove embedded project defaults and require explicit public settings. |
| M | `src/hooks/useCart.jsx` | Carry size through adds and merges, use atomic operation IDs and bound cart quantities. |
| M | `src/index.jsx` | Move optional analytics setup to an explicitly configured entry and provide the missing-configuration view. |
| M | `src/pages/AboutPage.jsx` | Use the compressed version of the existing store logo. |
| M | `src/pages/AdminOrder.jsx` | Archive instead of deleting financial records, require collection evidence and display stored amounts. |
| M | `src/pages/AdminProductManager.jsx` | Validate supported product-image types and headers, assign generated object names and align discount limits. |
| M | `src/pages/AuthPage.jsx` | Preserve variant quantities on login, support email-confirmed password setup/recovery and use the shared account session in profile. |
| M | `src/pages/BlogPage.jsx` | Share real newsletter submission and feedback across both entry points; remove placeholder blog actions lacking destinations. |
| M | `src/pages/CartPage.jsx` | Use row/quantity checks for concurrent changes and display separate variant lines. |
| M | `src/pages/CheckOut.jsx` | Persist per-owner attempt IDs, submit confirmed lines, label shipping fields and support gated COD. |
| M | `src/pages/HomePage.jsx` | Use fetched catalog data and compressed branding, handle load failures, expose search and working navigation. |
| M | `src/pages/PaymentCancel.jsx` | Use neutral cancellation messaging, owner-recorded status, legacy line rendering and explicit unpaid COD confirmation. |
| M | `src/pages/PaymentSuccess.jsx` | Use neutral cancellation messaging, owner-recorded status, legacy line rendering and explicit unpaid COD confirmation. |
| M | `src/pages/ProductDetails.jsx` | Use available stock/size data, remove fabricated rating metadata and use a real fallback asset. |
| M | `src/pages/ProductListings.jsx` | Use fetched catalog data and compressed branding, handle load failures, expose search and working navigation. |
| M | `src/pages/ProfilePage.jsx` | Preserve variant quantities on login, support email-confirmed password setup/recovery and use the shared account session in profile. |
| M | `src/pages/YourOrders.jsx` | Isolate fetched data by current user, support legacy snapshots and COD, offer accessible details and actual tracking references. |
| M | `src/styles/PaymentSuccess.css` | Remove the unused external font import from the payment screen. |
| M | `src/supabaseClient.jsx` | Remove embedded project defaults and require explicit public settings. |
| M | `src/utils/cart.js` | Carry size through adds and merges, use atomic operation IDs and bound cart quantities. |
| A | `src/utils/images.js` | Validate supported product-image types and headers, assign generated object names and align discount limits. |
| A | `src/utils/orders.js` | Normalize historical item shapes, verify arithmetic and recorded totals, safely render PDF data and compute paid staff totals. |
| A | `supabase/bootstrap/empty-project.sql` | Separate opt-in empty app provisioning from synthetic auth/storage test scaffolding. |
| M | `supabase/config.toml` | Align local auth redirect origins and remove the reference to a missing seed. |
| A | `supabase/migrations/20261122174027_checkout_integrity.sql` | Add transactional checkout, variant/operation identity, receipt and conflict handling, restricted COD collection, archive audit and inquiry claims. |
| M | `tests/e2e/server.mjs` | Exercise built pages and handlers with synthetic records, including lost-response recovery, mobile COD, cancellation, missing totals, PDF download and owner isolation. |
| M | `tests/e2e/store.spec.js` | Exercise built pages and handlers with synthetic records, including lost-response recovery, mobile COD, cancellation, missing totals, PDF download and owner isolation. |
| M | `tests/fixtures/schema.sql` | Separate opt-in empty app provisioning from synthetic auth/storage test scaffolding. |
| A | `tests/postgres/checkout.mjs` | Run real multi-connection checkout, COD, cart, replay, rollback, historic snapshot and inquiry invariants. |
| M | `tests/security/database.test.js` | Exercise both migrations and role/grant boundaries against a role-aware PGlite schema. |
| M | `tests/security/environment.test.js` | Use a synthetic public project in environment tests. |
| M | `tests/security/rendering.test.jsx` | Verify safe CSV/PDF rendering, snapshot arithmetic, historical data and image signatures. |
| M | `tests/server/handlers.test.js` | Verify checkout and callback validation, exact references, COD permission, failure states and inquiry evidence. |
| M | `vite.config.js` | Validate loaded environment settings and expose only four exact public configuration names. |

## Complete path inventory

The columns identify presence at each reference. The candidate column describes the reviewed local handoff tree. Compare the exact refs in the [audit](engineering-audit.md).

| Path | main | master | gh-pages | Candidate |
| --- | --- | --- | --- | --- |
| `.env` | yes | — | yes | — |
| `.env.example` | — | yes | — | yes |
| `.github/workflows/verify.yml` | — | yes | — | yes |
| `.gitignore` | yes | yes | yes | yes |
| `.npmrc` | yes | yes | — | yes |
| `.nvmrc` | — | yes | — | yes |
| `.vercel-trigger` | yes | yes | — | yes |
| `.vscode/extensions.json` | yes | yes | yes | yes |
| `.vscode/settings.json` | yes | yes | yes | yes |
| `404.html` | — | — | yes | — |
| `CNAME` | yes | yes | yes | yes |
| `GCMT-logo.png` | — | — | yes | — |
| `README.md` | yes | yes | — | yes |
| `api/cod-payment.js` | — | yes | — | yes |
| `api/create-order.js` | — | yes | — | yes |
| `api/order.js` | — | yes | — | yes |
| `api/payment-response.js` | — | yes | — | yes |
| `asset-manifest.json` | — | — | yes | — |
| `docs/deployment.md` | — | yes | — | yes |
| `docs/engineering-audit.md` | — | — | — | yes |
| `docs/engineering-questions.md` | — | — | — | yes |
| `docs/payment-lifecycle.md` | — | — | — | yes |
| `docs/review-scope.md` | — | — | — | yes |
| `favicon.ico` | — | — | yes | — |
| `index.html` | — | yes | yes | yes |
| `logo192.png` | — | — | yes | — |
| `logo512.png` | — | — | yes | — |
| `manifest.json` | — | — | yes | — |
| `package-lock.json` | yes | yes | — | yes |
| `package.json` | yes | yes | — | yes |
| `playwright.config.js` | — | yes | — | yes |
| `public/404.html` | yes | yes | — | yes |
| `public/CNAME` | yes | yes | — | yes |
| `public/GCMT-logo.png` | yes | yes | — | yes |
| `public/analytics.js` | — | yes | — | — |
| `public/favicon.ico` | yes | yes | — | yes |
| `public/index.html` | yes | — | — | — |
| `public/logo192.png` | yes | yes | — | yes |
| `public/logo512.png` | yes | yes | — | yes |
| `public/manifest.json` | yes | yes | — | yes |
| `public/robots.txt` | yes | yes | — | yes |
| `public/sitemap.xml` | yes | yes | — | yes |
| `robots.txt` | — | — | yes | — |
| `scripts/check-environment.mjs` | — | yes | — | yes |
| `scripts/check-secrets.mjs` | — | yes | — | yes |
| `scripts/dev.mjs` | — | yes | — | yes |
| `scripts/review.mjs` | — | — | — | yes |
| `server/ccavenue.js` | — | yes | — | yes |
| `server/checkout.js` | — | yes | — | yes |
| `server/environment.js` | — | — | — | yes |
| `server/http.js` | — | yes | — | yes |
| `server/orders.js` | — | yes | — | yes |
| `server/payment.js` | — | yes | — | yes |
| `server/reconciliation.js` | — | — | — | yes |
| `server/reference.js` | — | — | — | yes |
| `server/services.js` | — | yes | — | yes |
| `server/validation.js` | — | yes | — | yes |
| `shared/gateway.js` | — | — | — | yes |
| `sitemap.xml` | — | — | yes | — |
| `src/App.css` | yes | yes | — | yes |
| `src/App.jsx` | yes | yes | — | yes |
| `src/App.test.js` | yes | — | — | — |
| `src/App.test.jsx` | — | yes | — | yes |
| `src/AppContext.jsx` | yes | yes | — | yes |
| `src/assets/ARYA PATEL GCMT.jpg` | yes | yes | — | yes |
| `src/assets/GCMT-logo.png` | yes | yes | — | yes |
| `src/assets/GCMT-logo.webp` | — | — | — | yes |
| `src/assets/Product1.jpg` | yes | yes | — | yes |
| `src/assets/Product2.png` | yes | yes | — | yes |
| `src/assets/marketing-video.mp4` | yes | yes | — | yes |
| `src/assets/model.png` | yes | yes | — | yes |
| `src/assets/product.jpg` | yes | yes | — | yes |
| `src/assets/product.png` | yes | yes | — | yes |
| `src/components/AddToCartButton.jsx` | yes | yes | — | yes |
| `src/components/Footer.jsx` | yes | yes | — | yes |
| `src/components/InvoiceGenerator.jsx` | yes | yes | — | yes |
| `src/components/Navbar.jsx` | yes | yes | — | yes |
| `src/components/NewsletterForm.jsx` | — | — | — | yes |
| `src/components/ProductCard.jsx` | yes | yes | — | yes |
| `src/components/RequireAdmin.jsx` | — | yes | — | yes |
| `src/components/ReviewSystem.jsx` | yes | yes | — | yes |
| `src/components/ScrollToTop.jsx` | yes | yes | — | yes |
| `src/components/SmoothExperience.css` | yes | — | — | — |
| `src/components/SmoothExperience.jsx` | yes | — | — | — |
| `src/components/ToastContext.jsx` | yes | yes | — | yes |
| `src/config/public.js` | — | yes | — | — |
| `src/hooks/useCart.jsx` | yes | yes | — | yes |
| `src/index.css` | yes | yes | — | yes |
| `src/index.js` | yes | — | — | — |
| `src/index.jsx` | — | yes | — | yes |
| `src/logo.svg` | yes | yes | — | yes |
| `src/pages/AboutPage.jsx` | yes | yes | — | yes |
| `src/pages/AdminContactForm.jsx` | yes | yes | — | yes |
| `src/pages/AdminOrder.jsx` | yes | yes | — | yes |
| `src/pages/AdminPage.jsx` | yes | yes | — | yes |
| `src/pages/AdminProductManager.jsx` | yes | yes | — | yes |
| `src/pages/AdminSubscription.jsx` | yes | yes | — | yes |
| `src/pages/AuthPage.jsx` | yes | yes | — | yes |
| `src/pages/BlogPage.jsx` | yes | yes | — | yes |
| `src/pages/CartPage.jsx` | yes | yes | — | yes |
| `src/pages/CheckOut.jsx` | yes | yes | — | yes |
| `src/pages/ContactPage.jsx` | yes | yes | — | yes |
| `src/pages/FAQPage.jsx` | yes | yes | — | yes |
| `src/pages/HomePage.jsx` | yes | yes | — | yes |
| `src/pages/PaymentCancel.jsx` | yes | yes | — | yes |
| `src/pages/PaymentPages.jsx` | yes | — | — | — |
| `src/pages/PaymentSuccess.jsx` | yes | yes | — | yes |
| `src/pages/ProductDetails.jsx` | yes | yes | — | yes |
| `src/pages/ProductListings.jsx` | yes | yes | — | yes |
| `src/pages/ProfilePage.jsx` | yes | yes | — | yes |
| `src/pages/TnC.jsx` | yes | yes | — | yes |
| `src/pages/YourOrders.jsx` | yes | yes | — | yes |
| `src/reportWebVitals.js` | yes | yes | — | yes |
| `src/setupTests.js` | yes | yes | — | yes |
| `src/styles/AboutPage.css` | yes | yes | — | yes |
| `src/styles/AdminContactForm.css` | yes | yes | — | yes |
| `src/styles/AdminOrder.css` | yes | yes | — | yes |
| `src/styles/AdminPage.css` | yes | yes | — | yes |
| `src/styles/AdminProductManager.css` | yes | yes | — | yes |
| `src/styles/AdminSubscription.css` | yes | yes | — | yes |
| `src/styles/AuthPage.css` | yes | yes | — | yes |
| `src/styles/BlogPage.css` | yes | yes | — | yes |
| `src/styles/Cart.css` | yes | yes | — | yes |
| `src/styles/CartPage.css` | yes | yes | — | yes |
| `src/styles/CheckOut.css` | yes | yes | — | yes |
| `src/styles/ContactPage.css` | yes | yes | — | yes |
| `src/styles/FAQPage.css` | yes | yes | — | yes |
| `src/styles/Footer.css` | yes | yes | — | yes |
| `src/styles/HomePage.css` | yes | yes | — | yes |
| `src/styles/Navbar.css` | yes | yes | — | yes |
| `src/styles/PaymentCancel.css` | yes | yes | — | yes |
| `src/styles/PaymentPages.css` | yes | yes | — | yes |
| `src/styles/PaymentSuccess.css` | yes | yes | — | yes |
| `src/styles/ProductCard.css` | yes | yes | — | yes |
| `src/styles/ProductDetails.css` | yes | yes | — | yes |
| `src/styles/ProductListingPage.css` | yes | yes | — | yes |
| `src/styles/ProfilePage.css` | yes | yes | — | yes |
| `src/styles/ReviewSystem.css` | yes | yes | — | yes |
| `src/styles/ThankYou.css` | yes | yes | — | yes |
| `src/styles/Toast.css` | yes | yes | — | yes |
| `src/styles/YourOrders.module.css` | yes | yes | — | yes |
| `src/styles/globalAnimations.css` | yes | yes | — | yes |
| `src/supabaseClient.jsx` | yes | yes | — | yes |
| `src/utils/api.js` | — | yes | — | yes |
| `src/utils/cart.js` | — | yes | — | yes |
| `src/utils/ccaUtils.js` | yes | — | — | — |
| `src/utils/images.js` | — | — | — | yes |
| `src/utils/orders.js` | — | — | — | yes |
| `src/utils/security.js` | — | yes | — | yes |
| `static/css/main.8101c7b6.css` | — | — | yes | — |
| `static/css/main.8101c7b6.css.map` | — | — | yes | — |
| `static/js/453.905f22d3.chunk.js` | — | — | yes | — |
| `static/js/453.905f22d3.chunk.js.map` | — | — | yes | — |
| `static/js/732.f957402c.chunk.js` | — | — | yes | — |
| `static/js/732.f957402c.chunk.js.map` | — | — | yes | — |
| `static/js/952.26b32017.chunk.js` | — | — | yes | — |
| `static/js/952.26b32017.chunk.js.map` | — | — | yes | — |
| `static/js/977.f26c5ab6.chunk.js` | — | — | yes | — |
| `static/js/977.f26c5ab6.chunk.js.LICENSE.txt` | — | — | yes | — |
| `static/js/977.f26c5ab6.chunk.js.map` | — | — | yes | — |
| `static/js/main.928d366a.js` | — | — | yes | — |
| `static/js/main.928d366a.js.LICENSE.txt` | — | — | yes | — |
| `static/js/main.928d366a.js.map` | — | — | yes | — |
| `static/media/ARYA PATEL GCMT.32739331b74e665ab7ae.jpg` | — | — | yes | — |
| `static/media/GCMT-logo.e629a3fcb5c1e14689b1.png` | — | — | yes | — |
| `static/media/marketing-video.cd3e676e92418a73082a.mp4` | — | — | yes | — |
| `static/media/product.13a4bfe43c9ba0999195.png` | — | — | yes | — |
| `supabase/.gitignore` | yes | yes | yes | yes |
| `supabase/bootstrap/empty-project.sql` | — | — | — | yes |
| `supabase/config.toml` | yes | yes | — | yes |
| `supabase/functions/verifypayment/.npmrc` | yes | — | yes | — |
| `supabase/functions/verifypayment/deno.json` | yes | — | — | — |
| `supabase/functions/verifypayment/index.ts` | yes | — | — | — |
| `supabase/migrations/20261030203438_production_security.sql` | — | yes | — | yes |
| `supabase/migrations/20261122174027_checkout_integrity.sql` | — | — | — | yes |
| `test.js` | yes | — | — | — |
| `tests/e2e/server.mjs` | — | yes | — | yes |
| `tests/e2e/store.spec.js` | — | yes | — | yes |
| `tests/fixtures/schema.sql` | — | yes | — | yes |
| `tests/postgres/checkout.mjs` | — | — | — | yes |
| `tests/security/auth.test.jsx` | — | yes | — | yes |
| `tests/security/database.test.js` | — | yes | — | yes |
| `tests/security/environment.test.js` | — | yes | — | yes |
| `tests/security/rendering.test.jsx` | — | yes | — | yes |
| `tests/server/handlers.test.js` | — | yes | — | yes |
| `vercel.json` | yes | yes | — | yes |
| `vite.config.js` | — | yes | — | yes |
