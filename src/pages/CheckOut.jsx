import React, { useState, useEffect, useRef } from 'react';
import { supabase, ensureCheckoutUser } from '../supabaseClient';
import { loadCart, mergeGuestCart } from '../utils/cart';
import { authenticatedFetch } from '../utils/api';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import '../styles/CheckOut.css';

export default function Checkout() {
  const { user } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const submitting = useRef(false);
  const attemptId = useRef(null);

  // Responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State Management
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  // ==================== CART MANAGEMENT ====================

  useEffect(() => {
    fetchCart();
  }, [user?.id]);

  const fetchCart = async () => {
    setLoadingCart(true);
    try { setCartItems(await loadCart(user?.id,supabase)); }
    catch { showToast('Failed to load cart','error'); }
    finally { setLoadingCart(false); }
  };

  // ==================== FORM HANDLING ====================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'phone', 'street', 'city', 'state', 'pincode'];

    // Check for empty fields
    for (let field of requiredFields) {
      if (!formData[field]?.trim()) {
        showToast(`Please fill out the ${field.charAt(0).toUpperCase() + field.slice(1)} field.`, 'error');
        return false;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }

    // Phone validation (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return false;
    }

    // Pincode validation (6 digits)
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(formData.pincode.trim())) {
      showToast('Please enter a valid 6-digit pincode.', 'error');
      return false;
    }

    return true;
  };

  // ==================== CALCULATIONS ====================

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0; // Free shipping
  const total = subtotal + shipping;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const handleSubmitForm = () => {
    if (!validateForm() || !cartItems.length) return;
    setFormSubmitted(true);
  };
  const handleOnlinePayment = async () => {
    if (!formSubmitted || !validateForm() || !cartItems.length || submitting.current) return;
    submitting.current=true; setLoading(true);
    try {
      const checkoutUser = await ensureCheckoutUser();
      await mergeGuestCart(checkoutUser.id,supabase);
      if (!attemptId.current) attemptId.current=crypto.randomUUID();
      const result=await authenticatedFetch('/api/create-order',{method:'POST',body:JSON.stringify({attemptId:attemptId.current,shipping:formData})});
      if (result.totalPaise !== Math.round(total*100)) {
        attemptId.current=null; setCartItems(await loadCart(checkoutUser.id,supabase)); setFormSubmitted(false);
        throw new Error('Cart prices have changed. Review the updated total before continuing.');
      }
      if (result.gatewayUrl !== 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction') throw new Error('Unexpected payment destination.');
      // The server records the paid receipt and reconciles purchased cart quantities atomically.
      // Keep the cart intact during payment initiation, cancellation and network failures.
      await submitToCCAvenue(result.encRequest,result.accessCode);
    } catch(error) {
      showToast(error.message || 'Payment could not be started.','error');
      setLoading(false); submitting.current=false;
    }
  };

  const submitToCCAvenue = (encRequest, accessCode) => {
    return new Promise((resolve, reject) => {
      try {


        if (!encRequest || typeof encRequest !== 'string' || encRequest.trim().length === 0) {
          throw new Error('Invalid encRequest');
        }

        if (!accessCode || typeof accessCode !== 'string' || accessCode.trim().length === 0) {
          throw new Error('Invalid accessCode');
        }

        // Clean up existing forms
        const existingForms = document.querySelectorAll('form[data-ccavenue-form="true"]');
        existingForms.forEach(form => form.remove());

        // Create payment form
        const form = document.createElement('form');
        form.setAttribute('data-ccavenue-form', 'true');
        form.method = 'POST';
        form.action = 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
        form.target = '_self';
        form.style.display = 'none';
        form.enctype = 'application/x-www-form-urlencoded';
        form.acceptCharset = 'UTF-8';

        const encInput = document.createElement('input');
        encInput.type = 'hidden';
        encInput.name = 'encRequest';
        encInput.value = encRequest.trim();

        const accessInput = document.createElement('input');
        accessInput.type = 'hidden';
        accessInput.name = 'access_code';
        accessInput.value = accessCode.trim();

        form.appendChild(encInput);
        form.appendChild(accessInput);
        document.body.appendChild(form);



        setTimeout(() => {
          try {
            form.submit();
            resolve();
          } catch (submitError) {
            console.error('❌ Form submission error:', submitError);
            reject(new Error(`Form submission failed: ${submitError.message}`));
          }
        }, 100);
      } catch (err) {
        console.error('❌ Error in submitToCCAvenue:', err);
        reject(new Error(`CCAvenue submission failed: ${err.message}`));
      }
    });
  };

  // ==================== RENDER COMPONENTS ====================

  const renderShippingForm = () => (
    <div className="checkout-card">
      <h2>Shipping Information</h2>
      <div className="checkout-card-body">
        {Object.keys(formData).map((field) => (
          <div key={field} className="form-group">
            <label>
              {field.charAt(0).toUpperCase() +
                field.slice(1).replace(/([A-Z])/g, ' $1')}
              <span style={{ color: 'red' }}> *</span>
            </label>
            <input
              type={
                field === 'email'
                  ? 'email'
                  : field === 'phone'
                  ? 'tel'
                  : 'text'
              }
              name={field}
              value={formData[field]}
              onChange={handleChange}
              disabled={formSubmitted || loading}
              className="form-input"
              placeholder={
                field === 'phone'
                  ? '10-digit mobile number'
                  : field === 'pincode'
                  ? '6-digit postal code'
                  : field === 'email'
                  ? 'your@email.com'
                  : field === 'name'
                  ? 'Full Name'
                  : field === 'street'
                  ? 'House no, Street, Area'
                  : ''
              }
              maxLength={
                field === 'phone'
                  ? '10'
                  : field === 'pincode'
                  ? '6'
                  : undefined
              }
            />
          </div>
        ))}

        {!formSubmitted && (
          <button
            onClick={handleSubmitForm}
            disabled={loading || cartItems.length === 0}
            className="btn btn-primary"
          >
            Continue to Payment
          </button>
        )}

        {formSubmitted && (
          <div className="success-message">
            ✓ Contact information confirmed
            <button
              onClick={() => setFormSubmitted(false)}
              className="btn-link"
              style={{ marginLeft: '10px', fontSize: '14px' }}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrderSummary = () => (
    <div className="checkout-card">
      <h2>Order Summary</h2>
      <div className="checkout-card-body">
        {loadingCart ? (
          <div className="loading-message">Loading cart…</div>
        ) : cartItems.length ? (
          <ul className="order-summary-list">
            {cartItems.map((item, index) => (
              <li key={item.id || index} className="order-summary-item">
                <div className="order-item-details">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="order-item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-quantity">Qty: {item.quantity}</div>
                    <div className="item-unit-price">
                      {formatCurrency(item.price)} each
                    </div>
                  </div>
                </div>
                <div className="item-total">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-cart-message">
            <p>No items in cart</p>
            <button
              onClick={() => navigate('/products')}
              className="btn btn-outline"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {cartItems.length > 0 && (
          <>
            <div className="summary-row">
              <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span className="free-shipping">Free</span>
            </div>
            <div className="summary-row summary-row-total">
              <strong>Total Amount</strong>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderPaymentActions = () => {
    if (cartItems.length === 0) {
      return (
        <div className="checkout-actions">
          <button
            onClick={() => navigate('/cart')}
            className="btn btn-outline"
          >
            Return to Cart
          </button>
        </div>
      );
    }

    return (
      <div className="checkout-actions">
        <button
          onClick={() => navigate('/cart')}
          className="btn btn-outline"
          disabled={loading}
        >
          Return to Cart
        </button>

        {formSubmitted && (
          <div className="payment-methods">
            <button
              onClick={handleOnlinePayment}
              disabled={loading}
              className="btn btn-success payment-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(total)} Now`
              )}
            </button>
            <p className="payment-note">
              🔒 Secure payment powered by CCAvenue
            </p>
          </div>
        )}

        {!formSubmitted && (
          <div className="payment-info">
            Please fill in your contact information to proceed with payment
          </div>
        )}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <div className="checkout-steps">
            <span className="step active">1. Cart</span>
            <span className={`step ${formSubmitted ? 'active' : ''}`}>2. Information</span>
            <span className={`step ${loading ? 'active' : ''}`}>3. Payment</span>
          </div>
        </div>

        {isMobile ? (
          <div className="mobile-layout">
            {renderOrderSummary()}
            {renderShippingForm()}
            {renderPaymentActions()}
          </div>
        ) : (
          <div className="desktop-layout">
            <div className="left-column">
              {renderShippingForm()}
              {renderPaymentActions()}
            </div>
            <div className="right-column">
              {renderOrderSummary()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
