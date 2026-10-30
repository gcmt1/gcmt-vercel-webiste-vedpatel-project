import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppContext } from "../AppContext";
import { supabase } from "../supabaseClient";
export default function RequireAdmin({ children }) {
  const { user, loading } = useAppContext();
  const [checked, setChecked] = useState({ userId: null, allowed: false });
  const location = useLocation();
  useEffect(() => {
    let active = true;
    if (user)
      supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (active)
            setChecked({
              userId: user.id,
              allowed: !error && data?.role === "admin",
            });
        })
        .catch(() => {
          if (active) setChecked({ userId: user.id, allowed: false });
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  if (loading || (user && checked.userId !== user.id))
    return <p role="status">Checking account access…</p>;
  if (!user)
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (!checked.allowed) return <Navigate to="/" replace />;
  return children;
}
