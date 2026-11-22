const measurementId = import.meta.env.REACT_APP_GA_MEASUREMENT_ID;
if (/^G-[A-Z0-9]+$/.test(measurementId || "")) {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", measurementId);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
  document.head.appendChild(script);
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
const App = React.lazy(() => import('./App'));
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
     {import.meta.env.REACT_APP_SUPABASE_URL && import.meta.env.REACT_APP_SUPABASE_ANON_KEY
      ? <React.Suspense fallback={<p>Loading GCMT Shop…</p>}><App /></React.Suspense>
      : <main><h1>GCMT Shop</h1><p>Store configuration is required. For an isolated review, follow the local verification steps in the README.</p></main>}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
