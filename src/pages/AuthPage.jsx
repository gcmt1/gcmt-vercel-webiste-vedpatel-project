import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../AppContext";
import { guestUser } from "../shop/orders";
import { Page, Button, Field, Notice } from "../components/ui";
import s from "../components/commerce.module.css";
export default function AuthPage() {
  const { user } = useAppContext(),
    nav = useNavigate(),
    [register, setMode] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget),
      email = form.get("email").trim(),
      password = form.get("password"),
      name = form.get("name")?.trim();
    try {
      const result = register
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (!result.data.session) {
        setMessage("Check your email to finish confirming your account.");
        return;
      }
      const uid = result.data.session.user.id;
      const profile = await supabase
        .from("users")
        .select("id,role")
        .eq("id", uid)
        .maybeSingle();
      if (profile.error) throw profile.error;
      if (!profile.data) {
        const save = await supabase
          .from("users")
          .insert({ id: uid, email, name: name || "", role: "user" });
        if (save.error) throw save.error;
      }
      nav(profile.data?.role === "admin" ? "/admin-landing" : "/profile");
    } catch (err) {
      setMessage(err.message || "Account access failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page narrow>
      <div className={s.card}>
        <h1>{register ? "Create an account" : "Sign in"}</h1>
        {guestUser(user) && (
          <p className={s.quiet}>
            You are shopping as a guest. Signing in opens the history for that
            account.
          </p>
        )}
        <form key={String(register)} className={s.form} onSubmit={submit}>
          {register && (
            <Field label="Name" name="name" autoComplete="name" required />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
          />
          <label>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />{" "}
            Show password
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
          </Button>
        </form>
        {message && <Notice>{message}</Notice>}
        <Button
          secondary
          disabled={busy}
          onClick={() => {
            setMode(!register);
            setMessage("");
          }}
        >
          {register ? "Use an existing account" : "Create an account"}
        </Button>
      </div>
    </Page>
  );
}
