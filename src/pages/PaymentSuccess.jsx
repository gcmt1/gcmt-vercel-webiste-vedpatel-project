import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import '../styles/PaymentSuccess.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user } = useAppContext();
  const { showToast } = useToast();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchOrderDetails();
    
    // Trigger animation stages
    const timeouts = [
      setTimeout(() => setAnimationStage(1), 500),   // Success icon
      setTimeout(() => setAnimationStage(2), 1000),  // Title
      setTimeout(() => setAnimationStage(3), 1500),  // Order details
      setTimeout(() => setAnimationStage(4), 2000),  // Confetti
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // If we have orderId from URL, use it; otherwise get the latest order
      if (orderId) {
        query = query.eq('id', orderId);
      } else if (user?.id) {
        query = query.eq('user_id', user.id);
      } else {
        // For guest users, try to get the latest order
        const guestIdentifier = localStorage.getItem('guest_identifier');
        if (guestIdentifier) {
          query = query.is('user_id', null).limit(1);
        }
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        console.error('Error fetching order:', error);
        // If no order found, redirect to home
        if (error.code === 'PGRST116') {
          showToast('Order not found', 'error');
          navigate('/');
          return;
        }
        throw error;
      }

      setOrderData(data);
    } catch (err) {
      console.error('Error:', err);
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR' 
    }).format(amount);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="payment-success-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-page">
      {/* Confetti Animation */}
      <div className={`confetti-container ${animationStage >= 4 ? 'active' : ''}`}>
        {[...Array(50)].map((_, i) => (
          <div key={i} className={`confetti confetti-${i % 6}`}></div>
        ))}
      </div>

      <div className="success-content">
        {/* Success Icon with Animation */}
        <div className={`success-icon-container ${animationStage >= 1 ? 'animate' : ''}`}>
          <div className="success-icon">
            <div className="checkmark">
              <div className="checkmark-circle">
                <div className="checkmark-stem"></div>
                <div className="checkmark-kick"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Title */}
        <div className={`success-header ${animationStage >= 2 ? 'animate' : ''}`}>
          <h1 className="success-title">🎉 Order Placed Successfully!</h1>
          <p className="success-subtitle">
            Thank you for your purchase! Your order is being processed.
          </p>
        </div>

        {/* Order Details Card */}
        {orderData && (
          <div className={`order-details-card ${animationStage >= 3 ? 'animate' : ''}`}>
            {/* Order Summary Header */}
            <div className="order-header">
              <div className="order-number">
                <h2>Order #{orderData.id}</h2>
                <span className={`status-badge ${orderData.order_status.toLowerCase()}`}>
                  {orderData.order_status}
                </span>
              </div>
              <div className="order-date">
                {formatDate(orderData.created_at)}
              </div>
            </div>

            {/* Customer Information */}
            <div className="section customer-info">
              <h3>👤 Customer Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name:</span>
                  <span className="value">{orderData.user_name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{orderData.user_email}</span>
                </div>
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span className="value">{orderData.user_phone}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="section shipping-info">
              <h3>📍 Shipping Address</h3>
              <div className="address-block">
                <p>{orderData.address_line}</p>
                <p>{orderData.city}, {orderData.state} - {orderData.postal_code}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="section order-items">
              <h3>🛍️ Items Ordered</h3>
              <div className="items-list">
                {orderData.product_list?.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price">
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            <div className="section payment-info">
              <h3>💳 Payment Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Payment Method:</span>
                  <span className={`value payment-status ${orderData.payment_status.toLowerCase()}`}>
                    {orderData.payment_status === 'CASH_ON_DELIVERY' ? 
                      'Cash on Delivery' : 
                      orderData.payment_status
                    }
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Payment ID:</span>
                  <span className="value">{orderData.payment_id}</span>
                </div>
              </div>
            </div>

            {/* Order Total */}
            <div className="section order-total">
              <div className="total-row">
                <span className="total-label">Total Amount:</span>
                <span className="total-amount">{formatCurrency(orderData.total_amount)}</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="section next-steps">
              <h3>📦 What's Next?</h3>
              <div className="steps-list">
                <div className="step">
                  <span className="step-number">1</span>
                  <span className="step-text">Order confirmation email sent</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span className="step-text">
                    {orderData.payment_status === 'CASH_ON_DELIVERY' ?
                      'Preparing for delivery' :
                      'Processing payment'
                    }
                  </span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span className="step-text">Package shipped & tracking provided</span>
                </div>
                <div className="step">
                  <span className="step-number">4</span>
                  <span className="step-text">Delivered to your doorstep</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`action-buttons ${animationStage >= 3 ? 'animate' : ''}`}>
          <button 
            onClick={() => navigate('/products')} 
            className="btn btn-primary pulse-button"
          >
            🏠 Continue Shopping
          </button>
          <button 
            onClick={() => navigate('/your-orders')} 
            className="btn btn-outline"
          >
            📋 View All Orders
          </button>
        </div>

        {/* Thank You Message */}
        <div className={`thank-you-message ${animationStage >= 3 ? 'animate' : ''}`}>
          <p>🙏 Thank you for choosing us! We appreciate your business.</p>
          <p>💝 Share your experience and get 10% off your next order!</p>
        </div>
      </div>

      {/* Floating Particles Background */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className={`particle particle-${i % 4}`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}