import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./AppContext";
import { ToastProvider } from "./components/ToastContext";
import RequireAdmin from "./components/RequireAdmin";
import { HelmetProvider } from "react-helmet-async";

import HomePage from "./pages/HomePage";
import ProductListingPage from "./pages/ProductListings";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import ContactPage from "./pages/ContactPage";
import ProductDetails from "./pages/ProductDetails";
import FAQPage from "./pages/FAQPage";
import Navbar from "./components/Navbar";
import CartPage from "./pages/CartPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import Checkout from "./pages/CheckOut";
import Tnc from "./pages/TnC";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import AdminOrder from "./pages/AdminOrder";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import AdminLanding from "./pages/AdminPage";
import AdminSubscription from "./pages/AdminSubscription";
import AdminContactForm from "./pages/AdminContactForm";
import YourOrders from "./pages/YourOrders"; // ✅ Fix: Capital Y
import AdminProductManager  from "./pages/AdminProductManager"; // ✅ Fix: Import AdminProductManager
import "./App.css";

function App() {
  return (
    <HelmetProvider>
      <AppProvider>
        <ToastProvider>
          <Router>
            <ScrollToTop />
            <div className="app-container">
              <header className="app-header">
                <Navbar />
              </header>

              <main className="app-main">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductListingPage />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/terms-and-conditions" element={<Tnc />} />
                  <Route path="/tnc" element={<Tnc />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-cancel" element={<PaymentCancel />} />
                  <Route path="/admin-order" element={<RequireAdmin><AdminOrder /></RequireAdmin>} />
                  <Route path="/admin-landing" element={<RequireAdmin><AdminLanding /></RequireAdmin>} />
                  <Route path="/admin-subscription" element={<RequireAdmin><AdminSubscription /></RequireAdmin>} />
                  <Route path="/admin-contactform" element={<RequireAdmin><AdminContactForm /></RequireAdmin>} />
                  <Route path="/your-orders" element={<YourOrders />} /> {/* ✅ Fix case */}
                  <Route path="/admin-product-manager" element={<RequireAdmin><AdminProductManager /></RequireAdmin>} /> {/* ✅ Fix: Use correct component name */}
                  {/* Catch-all route for undefined paths */}
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>

              <footer className="app-footer">
                <Footer />
                <p>© 2025 Chase WorldWide. All rights reserved.</p>
              </footer>
            </div>
          </Router>
        </ToastProvider>
      </AppProvider>
    </HelmetProvider>
  );
}

export default App;
