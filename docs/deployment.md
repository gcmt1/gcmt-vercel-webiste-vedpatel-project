# Deployment preparation

Use Node.js 24 and the committed lockfile. Deploy this change to an isolated staging environment first.

1. Back up the database and record the currently active deployment and configuration. Use a staging clone with representative synthetic records for validation.
2. Compare the existing schema, constraints, enum values, grants, policies, triggers, and storage configuration with the migration prerequisites. Resolve any incompatible existing data or duplicate payment/cart keys before applying the migration. Audit existing administrator assignments and auth/profile triggers; remove conflicting role-writing triggers through a reviewed migration. Confirm that all existing customer accounts have a valid profile before cutover. Never apply it to an unidentified project.
3. Apply the checked-in migration in staging. It requires the existing application tables and product-image bucket; it does not recreate a production database. The migration replaces application-table access policies, so review any project-specific integrations before rollout.
4. Configure the browser URL and anon/publishable key for that staging project. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CCA_MERCHANT_ID`, `CCA_WORKING_KEY`, `CCA_ACCESS_CODE`, and a canonical HTTPS `SITE_URL` as server-only deployment variables. Use separate values for staging and production. Do not put server credentials under browser-exposed prefixes.
5. Configure and test Supabase anonymous sign-in for guest checkout, including provider rate limits and the project's abuse-prevention configuration. Guest accounts are created only on an explicit checkout action; no generated password is stored by the frontend.
6. Configure the merchant callback to the deployed same-origin payment-response endpoint. Complete approved gateway sandbox tests for success, failure, cancellation, duplicated responses, amount mismatch, and delayed responses. Confirm the gateway's response fields and encoding against the merchant integration documentation.
7. Run `npm ci`, `npm run check`, `npm run test:e2e`, and `npm run release:check` with the staging configuration. Install the Playwright browser using `npx playwright install chromium` before browser tests. The automated browser tests use a local identity/payment simulator and PostgreSQL engine; they do not replace a real provider sandbox test.
8. Verify visitor, customer, anonymous customer, and administrator permissions against the actual staging project's API, including role changes, order ownership, prices/statuses, uploads, and deletion. Review the database security advisor. Confirm full signup, guest conversion, login, cart, payment, invoice, and export flows.
9. Coordinate production migration and application deployment as one release. During cutover, stop accepting new checkout attempts until the database policies and server handlers are in place. Drain or reconcile in-progress payments. Retire superseded payment endpoints and their privileged credentials so there is only one authorized payment writer.
10. Rotate previously used private credentials through their providers and update the relevant services. Confirm replacements work before revoking old values where provider procedures require a coordinated rotation. Repository history cleanup requires a separate coordinated plan; deleting a current file does not revoke a credential.
11. Enable `SECURE_CHECKOUT_ENABLED=true` only after the service cutover and staging/provider checks pass. Check the production deployment, payment recording, and redacted error logs after promotion.

## Release gates

- `npm run release:check` validates required deployment variables and project/origin consistency. It does not certify database policies, gateway settings, or credential revocation.
- Vercel preview builds require an explicit isolated project URL; they cannot silently use the compatibility production URL.
- A missing server configuration leaves payment endpoints unavailable. There is no fallback to a separate, unvalidated payment service.
- CI and local tests must not receive production credentials or customer records.

## Recovery

Keep a database backup and a maintenance deployment available. If release validation fails, keep checkout disabled while investigating. Do not restore a frontend version that requires browser writes denied by the new policies. Roll back application and database changes only as a coordinated, reviewed operation; do not weaken access policies to make an old client work.
