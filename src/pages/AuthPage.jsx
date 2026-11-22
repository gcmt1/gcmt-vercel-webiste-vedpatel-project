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
    if (!name.trim() || name.length > 200 || (!session?.user?.is_anonymous && password.length < 8)) {
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
            data: { name: name.trim() },
          },{ emailRedirectTo:window.location.origin+"/auth?setPassword=1" })
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
          .select("product_id,variant,quantity")
          .eq("user_id", session.user.id);
        if (error) throw error;
        const cart = readGuestCart();
        for (const row of data || []) {
          const item = cart.find((item) => item.productId === row.product_id && (item.variant || "") === (row.variant || ""));
          if (item) item.quantity = Math.min(100, item.quantity + row.quantity);
          else cart.push({ productId: row.product_id, quantity: row.quantity, ...(row.variant && {variant:row.variant}) });
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
  async function requestReset() {
    if (!email.trim()) { showToast("Enter your email address.","error"); return; }
    setLoading(true);
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/auth?setPassword=1"});
      if(error) throw error;
      showToast("Check your email for a password reset link.","success");
    } catch { showToast("Password reset could not be requested.","error"); }
    finally { setLoading(false); }
  }
  async function setConfirmedPassword() {
    if(password.length<8) { showToast("Use at least eight characters.","error"); return; }
    setLoading(true);
    try {
      const {error}=await supabase.auth.updateUser({password});
      if(error) throw error;
      setPassword(""); navigate("/profile"); showToast("Password updated.","success");
    } catch { showToast("Reopen a valid confirmation or recovery email.","error"); }
    finally {setLoading(false);}
  }
  if(params.get("setPassword")==="1") return <div className="auth-page"><h1>Set your password</h1>
    {session?.user?.email_confirmed_at ? <><label htmlFor="new-password">New password</label>
    <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/>
    <button disabled={loading} onClick={setConfirmedPassword}>Save password</button></> :
    <p>Open the confirmation or recovery link sent to your email address.</p>}</div>;
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
        aria-label="Email" autoComplete="email" placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        aria-label="Password" autoComplete="current-password" placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      <input
        type="text"
        aria-label="Name (for sign-up only)" placeholder="Name (for sign-up only)"
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
      <button disabled={loading} onClick={requestReset}>Forgot password?</button>
    </div>
  );
}

export default AuthPage;
