import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./http.js";
let cached;
export function getDatabase(env = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HttpError(503, "Service is not configured.");
  if (!cached)
    cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
      },
    });
  return cached;
}
export async function authenticate(request, db) {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) throw new HttpError(401, "Please sign in.");
  const { data, error } = await db.auth.getUser(match[1]);
  if (error || !data?.user) throw new HttpError(401, "Please sign in again.");
  return data.user;
}
export async function requireAdmin(user, db) {
  const { data, error } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Role lookup failed");
  if (data?.role !== "admin")
    throw new HttpError(403, "Administrator access is required.");
}
