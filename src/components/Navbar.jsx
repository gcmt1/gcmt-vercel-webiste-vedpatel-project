import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, UserRound } from "lucide-react";
import { useAppContext } from "../AppContext";
import { supabase } from "../supabaseClient";
import logo from "../assets/GCMT-logo.png";
import { Dialog } from "./ui";
import s from "./shell.module.css";
const links = [
  ["/products", "Shop"],
  ["/about", "About GCMT"],
  ["/faq", "Help"],
  ["/your-orders", "Your orders"],
];
export default function Navbar() {
  const { pathname } = useLocation(),
    { user } = useAppContext(),
    [open, setOpen] = useState(false),
    [count, setCount] = useState(null),
    [staff, setStaff] = useState(null);
  const owner = user?.id;
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    let active = true;
    setStaff(null);
    if (owner)
      supabase
        .from("users")
        .select("role")
        .eq("id", owner)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data?.role === "admin") setStaff(owner);
        });
    return () => {
      active = false;
    };
  }, [owner]);
  useEffect(() => {
    let active = true;
    setCount(null);
    let request = 0;
    async function refresh() {
      if (!owner) return;
      const version = ++request;
      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", owner);
      if (active && version === request && !error)
        setCount(data.reduce((n, r) => n + Number(r.quantity), 0));
    }
    refresh();
    function storageChange(e) {
      if (e.key === "gcmt.cart.updated") refresh();
    }
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", storageChange);
    window.addEventListener("gcmt-cart-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", storageChange);
      window.removeEventListener("gcmt-cart-change", refresh);
    };
  }, [owner]);
  const items = links
    .concat(user && staff === user.id ? [["/admin-landing", "Operations"]] : [])
    .map(([to, label]) => (
      <NavLink key={to} to={to} onClick={() => setOpen(false)}>
        {label}
      </NavLink>
    ));
  return (
    <div className={s.bar}>
      <div className={s.inner}>
        <Link to="/" aria-label="GCMT Herbal home" className={s.brand}>
          <img src={logo} alt="GCMT Herbal" />
        </Link>
        <nav className={s.desktop} aria-label="Store">
          {items}
        </nav>
        <div className={s.tools}>
          <Link to="/profile" aria-label="Account">
            <UserRound size={21} />
          </Link>
          <Link
            to="/cart"
            aria-label={
              "Cart" + (count != null ? " · " + count + " items" : "")
            }
          >
            <ShoppingBag size={21} />
            {count > 0 && <span>{count}</span>}
          </Link>
          <button
            className={s.menu}
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
      {open && (
        <Dialog title="Menu" onClose={() => setOpen(false)}>
          <nav className={s.drawer}>{items}</nav>
        </Dialog>
      )}
    </div>
  );
}
