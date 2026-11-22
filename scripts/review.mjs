import { execFileSync } from "node:child_process";
const env = {
  ...process.env,
  REACT_APP_SUPABASE_URL: "http://127.0.0.1:4173/supabase",
  REACT_APP_SUPABASE_ANON_KEY: "sb_publishable_local_test",
  REACT_APP_GA_MEASUREMENT_ID: "",
};
execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  env,
  stdio: "inherit",
});
process.env.GCMT_FIXTURE_REVIEW = "true";
console.log(
  "GCMT Shop with synthetic records and checkout disabled at http://127.0.0.1:4173",
);
await import("../tests/e2e/server.mjs");
