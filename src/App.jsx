import React, { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { HelmetProvider } from "react-helmet-async";
import { supabase } from "./supabaseClient";
import { AppProvider } from "./AppContext";
import { ToastProvider } from "./components/ToastContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { Notice, Page, Button } from "./components/ui";
import "./App.css";
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductListings = lazy(() => import("./pages/ProductListings"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const CartPage = lazy(() => import("./pages/CartPage"));

const YourOrders = lazy(() => import("./pages/YourOrders"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const TnC = lazy(() => import("./pages/TnC"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminOrder = lazy(() => import("./pages/AdminOrder"));
const AdminProductManager = lazy(() => import("./pages/AdminProductManager"));
const AdminSubscription = lazy(() => import("./pages/AdminSubscription"));
const AdminContactForm = lazy(() => import("./pages/AdminContactForm"));
const Checkout = lazy(() => import("./pages/CheckOut"));
const AdminShell = lazy(() => import("./admin/AdminShell"));
function Home() {
  const { hash } = useLocation();
  return hash.split("?")[0] === "#/payment-success" ? (
    <Navigate replace to="/your-orders" />
  ) : (
    <HomePage />
  );
}
function Shell() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <a className="gcmt-skip" href="#content">
        Skip to content
      </a>
      <header data-ui="navbar">
        <Navbar />
      </header>
      <main
        id="content"
        tabIndex="-1"
        data-page={pathname.split("/")[1] || "home"}
      >
        <Suspense
          fallback={
            <Page>
              <Notice>Loading…</Notice>
            </Page>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductListings />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/your-orders" element={<YourOrders />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/payment-cancel" element={<PaymentCancel />} />
            <Route path="/payment-failure" element={<PaymentCancel />} />
            <Route path="/payment-pending" element={<PaymentCancel />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/tnc" element={<TnC />} />
            <Route
              path="/admin-landing"
              element={
                <AdminShell>
                  <AdminPage />
                </AdminShell>
              }
            />
            <Route
              path="/admin-order"
              element={
                <AdminShell>
                  <AdminOrder />
                </AdminShell>
              }
            />
            <Route
              path="/admin-product-manager"
              element={
                <AdminShell>
                  <AdminProductManager />
                </AdminShell>
              }
            />
            <Route
              path="/admin-subscription"
              element={
                <AdminShell>
                  <AdminSubscription />
                </AdminShell>
              }
            />
            <Route
              path="/admin-contactform"
              element={
                <AdminShell>
                  <AdminContactForm />
                </AdminShell>
              }
            />
            <Route path="/terms-and-conditions" element={<TnC />} />
            <Route
              path="/payment-success"
              element={<PaymentCancel />}
            />
            <Route path="/login" element={<Navigate replace to="/auth" />} />
            <Route
              path="*"
              element={
                <Page>
                  <h1>Page unavailable</h1>
                  <Button to="/products">Shop products</Button>
                </Page>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {!pathname.startsWith("/admin-") && (
        <div data-ui="footer">
          <Footer />
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <HelmetProvider>
      <SessionContextProvider supabaseClient={supabase}>
        <AppProvider>
          <ToastProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </ToastProvider>
        </AppProvider>
      </SessionContextProvider>
    </HelmetProvider>
  );
}
