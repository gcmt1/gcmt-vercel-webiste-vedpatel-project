import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Package,
  Mail,
  ShoppingBag,
} from "lucide-react";
import { useAppContext } from "../AppContext";
import { supabase } from "../supabaseClient";
import { Page, Notice, Button } from "../components/ui";
import s from "./admin.module.css";
export const sections = [
  ["/admin-landing", "Overview", LayoutDashboard],
  ["/admin-order", "Orders", ShoppingBag],
  ["/admin-product-manager", "Products", Package],
  ["/admin-contactform", "Enquiries", Inbox],
  ["/admin-subscription", "Subscriptions", Mail],
];
export default function AdminShell({ children }) {
  const { user, startingGuest } = useAppContext();
  if (startingGuest)
    return (
      <Page>
        <Notice>Checking staff access…</Notice>
      </Page>
    );
  if (!user)
    return (
      <Page>
        <h1>Staff access required</h1>
        <Link to="/auth">Sign in</Link>
      </Page>
    );
  return (
    <Staff key={user.id} owner={user.id}>
      {children}
    </Staff>
  );
}
function Staff({ owner, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [access, set] = useState("loading"),
    [rev, retry] = useState(0);
  useEffect(() => {
    let active = true;
    set("loading");
    supabase
      .from("users")
      .select("role")
      .eq("id", owner)
      .maybeSingle()
      .then(({ error, data }) => {
        if (active)
          set(error ? "error" : data?.role === "admin" ? "ready" : "denied");
      });
    return () => {
      active = false;
    };
  }, [owner, rev]);
  if (access !== "ready")
    return (
      <Page>
        {access === "loading" ? (
          <Notice>Checking staff access…</Notice>
        ) : (
          <div>
            <h1>
              {access === "error"
                ? "Unable to verify staff access"
                : "Staff access required"}
            </h1>
            {access === "error" ? (
              <Button onClick={() => retry((v) => v + 1)}>Retry</Button>
            ) : (
              <Link to="/auth">Sign in with a staff account</Link>
            )}
          </div>
        )}
      </Page>
    );
  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <Link to="/admin-landing" className={s.title}>
          GCMT Operations
        </Link>
        <button
          className={s.menuToggle}
          aria-expanded={menuOpen}
          aria-controls="staff-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Workspace menu
        </button>
        <nav id="staff-nav" data-open={menuOpen} aria-label="Staff navigation">
          {sections.map(([url, label, Icon]) => (
            <NavLink key={url} to={url} onClick={() => setMenuOpen(false)}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <Link to="/profile">Account &amp; sign out</Link>
        </nav>
        <Link to="/">View storefront</Link>
      </aside>
      <div className={s.workspace}>{children}</div>
    </div>
  );
}
