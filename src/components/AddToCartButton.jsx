import React from 'react';
import { useCart } from '../hooks/useCart';
import { useToast } from '../components/ToastContext';
import "../styles/Cart.css";

export default function AddToCartButton({ productId, quantity = 1 }) {
  const { addToCart, loading } = useCart();
  const { showToast } = useToast(); // ✅ Import toast

  const handleClick = async () => {
    const success = await addToCart(productId, quantity);
    if (success) {
      showToast('✅ Product added to cart!', 'success');
    } else {
      showToast('❌ Failed to add to cart. Try again.', 'error');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="add-to-cart-btn"
    >
      {loading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
