import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Button, Field } from "./ui";
import s from "./shell.module.css";
export default function Footer() {
  const [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function subscribe(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert({ email: email.trim() });
      if (error) throw error;
      setMessage("Subscription received.");
      setEmail("");
    } catch {
      setMessage("Subscription could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <footer className={s.footer}>
      <div>
        <strong>GCMT Herbal</strong>
        <p>
          Gold Coin Multi-Trade Private Limited
          <br />
          Gandhinagar, Gujarat, India
        </p>
        <a href="mailto:gcmtshop@gmail.com">gcmtshop@gmail.com</a>
      </div>
      <nav aria-label="Footer">
        <Link to="/contact">Contact</Link>
        <Link to="/terms-and-conditions">Delivery &amp; policies</Link>
        <Link to="/blog">Journal</Link>
        <a href="https://www.instagram.com/gcmt.shop.official/">Instagram</a>
      </nav>
      <form onSubmit={subscribe}>
        <Field
          label="Newsletter email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" secondary disabled={busy}>
          Subscribe
        </Button>
        <p role="status">{message}</p>
      </form>
    </footer>
  );
}
