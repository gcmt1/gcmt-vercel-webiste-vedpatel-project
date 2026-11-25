import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../AppContext";
import { guestUser, displayDate } from "../shop/orders";
import { Page, Button, Notice } from "../components/ui";
import s from "../components/commerce.module.css";
export default function Profile() {
  const { user, startingGuest } = useAppContext(),
    [error, setError] = useState("");
  const guest = guestUser(user);
  async function logout() {
    const r = await supabase.auth.signOut();
    if (r.error) setError("Could not sign out. Please try again.");
  }
  return (
    <Page narrow>
      <div className={s.card}>
        <h1>Your account</h1>
        {startingGuest ? (
          <Notice>Restoring session…</Notice>
        ) : (
          <>
            <h2>
              {guest ? "Guest session" : user?.email || "Welcome to GCMT"}
            </h2>
            {user && (
              <details>
                <summary>Account details</summary>
                <p>Account ID · {user.id}</p>
                <p>Member since {displayDate(user.created_at)}</p>
              </details>
            )}
            {guest && (
              <p>
                Your orders are linked to this browser session. Switching
                accounts changes the order history you can see.
              </p>
            )}
            <div className={s.actions}>
              <Button to="/your-orders">Your orders</Button>
              {!user || guest ? (
                <Button secondary to="/auth">
                  Sign in or register
                </Button>
              ) : (
                <Button secondary onClick={logout}>
                  Sign out
                </Button>
              )}
            </div>
          </>
        )}
        {error && <Notice error>{error}</Notice>}
      </div>
    </Page>
  );
}
