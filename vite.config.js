import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { execFileSync } from "node:child_process";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  execFileSync(process.execPath, ["scripts/check-environment.mjs"], {
    env,
    stdio: "inherit",
  });
  return {
    plugins: [react()],
    envPrefix: [],
    define: Object.fromEntries(
      [
        "REACT_APP_SUPABASE_URL",
        "REACT_APP_SUPABASE_ANON_KEY",
        "REACT_APP_GA_MEASUREMENT_ID",
        "REACT_APP_COD_ENABLED",
      ].map((name) => [
        "import.meta.env." + name,
        JSON.stringify(env[name] || ""),
      ]),
    ),
    build: { outDir: "build", sourcemap: false },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/setupTests.js"],
      include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}"],
      exclude: ["node_modules/**", "tests/e2e/**"],
      restoreMocks: true,
    },
  };
});
