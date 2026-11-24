import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useToast } from './ToastContext';
import '../styles/Cart.css';

export default function AddToCartButton({
  productId, quantity = 1, variant = '', disabled = false, showBuyNow = false,
}) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState(null);

  const handleClick = async (action) => {
    if (disabled || pending) return;
    setPending(action);
    const buyNow = action === 'buy';
    try {
      const added = await addToCart(productId, quantity, variant);
      if (!added) throw new Error('Cart update failed');
      if (buyNow) {
        navigate('/checkout');
      } else {
        showToast('✅ Product added to cart!', 'success');
      }
    } catch {
      showToast(buyNow ? 'Could not start checkout. Please try again.' : '❌ Failed to add to cart. Try again.', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <button type="button" onClick={() => handleClick('cart')} disabled={disabled || !!pending} className="add-to-cart-btn">
        {pending === 'cart' ? 'Adding...' : 'Add to Cart'}
      </button>
      {showBuyNow && (
        <button type="button" data-action="buy-now" onClick={() => handleClick('buy')} disabled={disabled || !!pending}>
          {pending === 'buy' ? 'Opening checkout...' : 'Buy Now'}
        </button>
      )}
    </>
  );
}
