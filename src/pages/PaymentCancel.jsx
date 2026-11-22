import React from 'react';
import { CircleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/PaymentCancel.css'; // Optional: Add styles

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="payment-cancel-container">
      <div className="cancel-card">
        <CircleAlert className="cancel-icon" aria-hidden="true" />
        <h1>Check your payment status</h1>
        <p>Open your order history to see the last recorded payment status.</p>
        <p>If your account was debited, contact the store before paying again.</p>
        <div className="cancel-actions">
          <button onClick={() => navigate('/your-orders')} className="btn btn-primary">
            View orders
          </button>
          <button onClick={() => navigate('/')} className="btn btn-outline">
            Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}
