import React, { createContext, useCallback, useContext, useState } from "react";
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback(
    (message, type = "success", duration = 4000) => {
      const id = crypto.randomUUID();
      setToasts((old) => [...old, { id, message, type }]);
      setTimeout(
        () => setToasts((old) => old.filter((t) => t.id !== id)),
        duration,
      );
    },
    [],
  );
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="gcmt-status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
