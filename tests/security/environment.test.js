// @vitest-environment node
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { publicSupabaseUrl } from "../../src/config/public.js";

function checkEnvironment(configuration = {}, args = []) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (
      /^(REACT_APP_SUPABASE_|SUPABASE_|CCA_|VERCEL_|SECURE_CHECKOUT_|SITE_URL$)/.test(
        name,
      )
    )
      delete env[name];
  }
  return spawnSync(
    process.execPath,
    ["scripts/check-environment.mjs", ...args],
    { env: { ...env, ...configuration }, encoding: "utf8" },
  );
}

it("accepts the explicitly configured existing project for preview builds", () => {
  const result = checkEnvironment({
    VERCEL_ENV: "preview",
    REACT_APP_SUPABASE_URL: publicSupabaseUrl,
    REACT_APP_SUPABASE_ANON_KEY: "sb_publishable_test_fixture",
  });
  expect(result.status).toBe(0);
});

it("accepts an explicitly configured isolated preview project", () => {
  const result = checkEnvironment({
    VERCEL_ENV: "preview",
    REACT_APP_SUPABASE_URL: "https://staging.example.test",
    REACT_APP_SUPABASE_ANON_KEY: "sb_publishable_test_fixture",
  });
  expect(result.status).toBe(0);
});

it.each(["REACT_APP_SUPABASE_URL", "REACT_APP_SUPABASE_ANON_KEY"])(
  "rejects missing %s instead of silently using a compatibility default",
  (missing) => {
    const configuration = {
      VERCEL_ENV: "preview",
      REACT_APP_SUPABASE_URL: publicSupabaseUrl,
      REACT_APP_SUPABASE_ANON_KEY: "sb_publishable_test_fixture",
    };
    delete configuration[missing];
    const result = checkEnvironment(configuration);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(missing);
  },
);

it("continues to block a release without the required server configuration", () => {
  const result = checkEnvironment({}, ["--release"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Missing required server configuration");
});
