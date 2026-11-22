import {
  checkDatabaseTarget,
  isClientProduction,
} from "../server/environment.js";
const env = process.env;
const production = env.VERCEL_ENV === "production";
const preview = env.VERCEL_ENV === "preview";
const release = process.argv.includes("--release");
function fail(message) {
  console.error(message);
  process.exit(1);
}
const browserUrl = env.REACT_APP_SUPABASE_URL;
for (const url of [browserUrl, env.SUPABASE_URL]) checkDatabaseTarget(url, env);
if (env.CCA_ENVIRONMENT === "production" && !isClientProduction(env))
  fail("Live gateway settings require the client production deployment.");
if (
  (release || production || preview) &&
  (env.REACT_APP_COD_ENABLED === "true") !== (env.STORE_COD_ENABLED === "true")
)
  fail("The storefront and server COD settings must agree.");
if (
  production &&
  (env.STORE_COD_ENABLED === "true" ||
    env.SECURE_CHECKOUT_ENABLED === "true") &&
  !isClientProduction(env)
)
  fail(
    "Verify the production repository and configured branch before enabling checkout.",
  );
if (
  production &&
  env.SECURE_CHECKOUT_ENABLED === "true" &&
  env.CCA_ENVIRONMENT !== "production"
)
  fail(
    "Online checkout requires the approved production merchant configuration.",
  );
const browserKey = env.REACT_APP_SUPABASE_ANON_KEY;
if (browserKey && !browserKey.startsWith("sb_publishable_")) {
  let role;
  try {
    role = JSON.parse(
      Buffer.from(browserKey.split(".")[1], "base64url").toString(),
    ).role;
  } catch {}
  if (role !== "anon")
    fail("A publishable or anon key is required for browser builds.");
}

if (
  (preview || production || release) &&
  (!env.REACT_APP_SUPABASE_URL || !env.REACT_APP_SUPABASE_ANON_KEY)
)
  fail(
    "Configure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY before building a deployment.",
  );
if (release || (production && env.SECURE_CHECKOUT_ENABLED === "true")) {
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CCA_ENVIRONMENT",
    "CCA_MERCHANT_ID",
    "CCA_WORKING_KEY",
    "CCA_ACCESS_CODE",
    "SITE_URL",
  ])
    if (!env[name]) fail("Missing required server configuration: " + name);
  if (
    !["production", "sandbox"].includes(env.CCA_ENVIRONMENT) ||
    env.CCA_CALLBACKS_ENABLED !== "true"
  )
    fail("Configure gateway environment and callback processing.");
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
