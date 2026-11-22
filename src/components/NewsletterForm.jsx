import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function NewsletterForm({ className, inputClass, buttonClass, buttonText }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function subscribe(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    setBusy(true);
    try {
      const { error } = await supabase.from('newsletter_subscriptions').insert([{ email }]);
      if (error) throw error;
      form.reset();
      setMessage('Thank you for subscribing!');
    } catch {
      setMessage('Subscription failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return <>
    <form className={className} onSubmit={subscribe}>
      <input type="email" name="email" aria-label="Newsletter email" required maxLength={320}
        placeholder="Enter your email" className={inputClass} />
      <button type="submit" disabled={busy} className={buttonClass}>{buttonText}</button>
    </form>
    <p role="status">{message}</p>
  </>;
}
