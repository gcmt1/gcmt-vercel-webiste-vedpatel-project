import { createClient } from "@supabase/supabase-js";
import { publicSupabaseUrl, publicSupabaseKey } from "./config/public";
const supabaseUrl = import.meta.env.REACT_APP_SUPABASE_URL || publicSupabaseUrl;
const supabaseKey =
  import.meta.env.REACT_APP_SUPABASE_ANON_KEY || publicSupabaseKey;
// A browser may use an anon/publishable key, never a privileged backend key.
if (supabaseKey.startsWith("sb_secret_"))
  throw new Error("Invalid browser service configuration.");
if (supabaseKey.startsWith("eyJ")) {
  try {
    const role = JSON.parse(
      atob(supabaseKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ).role;
    if (role !== "anon") throw new Error("Privileged key");
  } catch {
    throw new Error("Invalid browser service configuration.");
  }
}
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
export function clearGuestCredentials() {
  for (const name of [
    "guest_user_id",
    "guest_user_email",
    "guest_user_password",
  ])
    localStorage.removeItem(name);
}
export function isGuestUser(user) {
  return Boolean(
    user?.is_anonymous ||
    /@guest\.local$|^guest_[^@]+@example\.com$/.test(user?.email || ""),
  );
}
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}
let checkoutSession;
export async function ensureCheckoutUser() {
  const current = await getCurrentUser();
  if (current) return current;
  // Guest accounts are created on an explicit checkout action, never on page load.
  if (!checkoutSession)
    checkoutSession = supabase.auth
      .signInAnonymously()
      .then(({ data, error }) => {
        if (error || !data?.user)
          throw new Error(
            "Guest checkout is unavailable. Please sign in or create an account.",
          );
        return data.user;
      })
      .finally(() => {
        checkoutSession = null;
      });
  return checkoutSession;
}
