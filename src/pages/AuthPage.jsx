import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../AppContext";
import { useToast } from "../components/ToastContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mergeGuestCart, readGuestCart, writeGuestCart } from "../utils/cart";
import { safeReturnPath } from "../utils/security";
import "../styles/AuthPage.css";
function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const handleSignUp = async () => {
    if (!name.trim() || name.length > 200 || password.length < 8) {
      showToast(
        "Enter your name and a password of at least 8 characters.",
        "error",
      );
      return;
    }
    setLoading(true);
    try {
      const result = session?.user?.is_anonymous
        ? await supabase.auth.updateUser({
            email: email.trim(),
            password,
            data: { name: name.trim() },
          })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { name: name.trim() } },
          });
      if (result.error) throw result.error;
      if (result.data.session)
        await mergeGuestCart(result.data.session.user.id, supabase);
      showToast(
        "Account request received. Check your email for any required confirmation.",
        "success",
      );
      navigate(safeReturnPath(params.get("returnTo")));
    } catch {
      showToast(
        "Account creation could not be completed. Please check your details and try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
  const handleLogin = async () => {
    setLoading(true);
    try {
      // Preserve only cart product IDs/quantities before changing an anonymous session.
      let anonymousCart;
      if (session?.user?.is_anonymous) {
        const { data, error } = await supabase
          .from("cart_items")
          .select("product_id,quantity")
          .eq("user_id", session.user.id);
        if (error) throw error;
        const cart = readGuestCart();
        for (const row of data || []) {
          const item = cart.find((item) => item.productId === row.product_id);
          if (item) item.quantity = Math.min(100, item.quantity + row.quantity);
          else cart.push({ productId: row.product_id, quantity: row.quantity });
        }
        anonymousCart = cart;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) throw error || new Error("Missing user");
      if (anonymousCart) writeGuestCart(anonymousCart);
      await mergeGuestCart(data.user.id, supabase);
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      showToast("Signed in successfully.", "success");
      navigate(
        safeReturnPath(
          params.get("returnTo"),
          profile?.role === "admin" ? "/admin-landing" : "/",
        ),
      );
    } catch {
      showToast(
        "Sign-in could not be completed. Check your details and try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <h1>Login / Sign Up</h1>

      {session?.user?.is_anonymous && (
        <div className="guest-notice">
          <p>
            🎭 You're currently browsing as a guest. Login or sign up to save
            your orders and preferences!
          </p>
        </div>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Name (for sign-up only)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <button onClick={handleSignUp} disabled={loading}>
        {loading ? "Processing..." : "Sign Up"}
      </button>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Processing..." : "Log In"}
      </button>
    </div>
  );
}

export default AuthPage;
