import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from './supabaseClient';
import { ensureOrderSession } from './orderSession';

const AppContext = createContext();

export function AppProvider({ children }) {
  const { session, isLoading } = useSessionContext();
  const [startingGuest, setStartingGuest] = useState(true);

  useEffect(() => {
    if (isLoading || session) return;
    let active = true;
    setStartingGuest(true);
    ensureOrderSession(supabase.auth, localStorage).catch(() => {
      // Checkout retries session startup and displays a failure to the shopper.
    }).finally(() => { if (active) setStartingGuest(false); });
    return () => { active = false; };
  }, [isLoading, session]);

  return <AppContext.Provider value={{
    user: session?.user ?? null, startingGuest: isLoading || (!session && startingGuest),
  }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
