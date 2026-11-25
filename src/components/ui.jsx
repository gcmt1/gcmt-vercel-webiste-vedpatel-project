import React, { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import s from "./ui.module.css";

export function Page({ children, narrow = false }) {
  return <div className={narrow ? s.narrow : s.page}>{children}</div>;
}
export function Button({
  to,
  secondary = false,
  children,
  type = "button",
  ...props
}) {
  const className = secondary ? s.secondary : s.button;
  return to ? (
    <Link className={className} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  );
}
export function Field({ label, multiline = false, ...props }) {
  const id = useId();
  const Input = multiline ? "textarea" : "input";
  return (
    <label className={s.field} htmlFor={id}>
      {label}
      <Input id={id} {...props} />
    </label>
  );
}
export function Notice({ children, error = false }) {
  return (
    <div
      className={error ? s.error : s.notice}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Dialog({ title, onClose, children }) {
  const ref = useRef(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={s.dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog">
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function LoadingSkeleton({ label }) {
  return (
    <div role="status" className={s.skeleton}>
      <span>{label}</span>
      <div aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
