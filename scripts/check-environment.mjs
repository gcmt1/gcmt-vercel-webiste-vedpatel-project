import { publicSupabaseUrl } from "../src/config/public.js";
const env = process.env;
const production = env.VERCEL_ENV === "production";
const preview = env.VERCEL_ENV === "preview";
const release = process.argv.includes("--release");
function fail(message) {
  console.error(message);
  process.exit(1);
}
const browserUrl = env.REACT_APP_SUPABASE_URL || publicSupabaseUrl;
if (
  preview &&
  (!env.REACT_APP_SUPABASE_URL || browserUrl === publicSupabaseUrl)
)
  fail(
    "Configure isolated preview service credentials before building a preview.",
  );
if (release || (production && env.SECURE_CHECKOUT_ENABLED === "true")) {
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CCA_MERCHANT_ID",
    "CCA_WORKING_KEY",
    "CCA_ACCESS_CODE",
    "SITE_URL",
  ])
    if (!env[name]) fail("Missing required server configuration: " + name);
  if (env.SECURE_CHECKOUT_ENABLED !== "true")
    fail("Secure checkout is not enabled for release.");
  if (env.SUPABASE_URL.replace(/\/$/, "") !== browserUrl.replace(/\/$/, ""))
    fail("Frontend and backend must target the same reviewed project.");
  const site = new URL(env.SITE_URL);
  if (
    site.protocol !== "https:" ||
    site.pathname !== "/" ||
    site.search ||
    site.hash ||
    site.username ||
    site.password
  )
    fail("Configure a canonical HTTPS site origin.");
}
console.log("Build environment checks passed.");
