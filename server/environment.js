import { createHash } from "node:crypto";
const commercialHostDigest =
  "e675806b639da64484061a67e0794c96731bdf587b08b4a3226ddb6ee31ad722";

export function isClientProduction(env) {
  return (
    env.VERCEL_ENV === "production" &&
    env.VERCEL_GIT_REPO_OWNER === "gcmt1" &&
    env.VERCEL_GIT_REPO_SLUG === "gcmt-vercel-webiste-vedpatel-project" &&
    Boolean(env.STORE_PRODUCTION_BRANCH) &&
    env.VERCEL_GIT_COMMIT_REF === env.STORE_PRODUCTION_BRANCH
  );
}
export function checkDatabaseTarget(url, env) {
  if (!url) return;
  const target = new URL(url);
  if (target.username || target.password || target.search || target.hash)
    throw new Error("Invalid Supabase URL.");
  if (
    target.protocol !== "https:" &&
    !(
      target.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)
    )
  )
    throw new Error("Use HTTPS or an isolated loopback database.");
  const digest = createHash("sha256")
    .update(target.hostname.toLowerCase().replace(/\.$/, ""))
    .digest("hex");
  if (digest === commercialHostDigest && !isClientProduction(env))
    throw new Error(
      "The commercial database is restricted to the client production deployment.",
    );
}
