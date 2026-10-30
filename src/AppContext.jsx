import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, clearGuestCredentials } from "./supabaseClient";
const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    clearGuestCredentials();
    // Remove the old, conflicting guest storage after migrating only product IDs and quantities.
    try {
      if (
        !localStorage.getItem("guest_cart") &&
        sessionStorage.getItem("guest_cart")
      )
        localStorage.setItem(
          "guest_cart",
          sessionStorage.getItem("guest_cart"),
        );
      sessionStorage.removeItem("guest_cart");
    } catch {
      /* Storage can be disabled by the browser. */
    }
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        changed = true;
        if (active) {
          setSession(next);
          setLoading(false);
        }
      },
    );
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !changed) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return (
    <AppContext.Provider
      value={{ user: session?.user || null, session, loading }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useAppContext() {
  return useContext(AppContext);
}
