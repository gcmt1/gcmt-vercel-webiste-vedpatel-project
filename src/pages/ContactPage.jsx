import React, { useState } from "react";
import { Page, Field, Button, Notice } from "../components/ui";
import { supabase } from "../supabaseClient";
import s from "../styles/editorial.module.css";
export default function Contact() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .insert(Object.fromEntries(new FormData(form)));
      if (error) throw error;
      form.reset();
      setMessage("Your enquiry was sent.");
    } catch {
      setMessage("Your enquiry could not be sent. Try again or email GCMT.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <div className={s.contact}>
        <div className={s.contactDetails}>
          <h1>Contact GCMT</h1>
          <p>213, Pratik Mall, Kudasan, Gandhinagar, Gujarat</p>
          <p>
            Monday–Friday, 9 am–6 pm
            <br />
            Saturday, 10 am–4 pm
          </p>
          <div className={s.contactLinks}>
            <a href="mailto:gcmtshop@gmail.com">gcmtshop@gmail.com</a>
            <a href="tel:+917623818818">+91 7623818818</a>
          </div>
        </div>
        <form className={s.enquiry} onSubmit={submit}>
          <h2>Send an enquiry</h2>
          <Field label="Name" name="name" autoComplete="name" required />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
          <Field label="Message" name="message" multiline required />
          <Button type="submit" disabled={busy}>
            Send enquiry
          </Button>
          {message && <Notice>{message}</Notice>}
        </form>
      </div>
    </Page>
  );
}
