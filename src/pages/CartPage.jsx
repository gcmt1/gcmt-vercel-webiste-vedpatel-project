import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { useToast } from '../components/ToastContext';
import { useNavigate } from 'react-router-dom';
import { loadCart, writeGuestCart, validQuantity } from '../utils/cart';
import '../styles/CartPage.css';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, Lock, Truck, Shield } from 'lucide-react';
function CartPage() {
  const [cartItems,setCartItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const [updateLoading,setUpdateLoading] = useState(null);
  const [removeLoading,setRemoveLoading] = useState(null);
  const {user,loading:userLoading} = useAppContext();
  const {showToast} = useToast();
  const navigate = useNavigate();
  useEffect(()=>{
    let active=true; if(userLoading) return;
    setLoading(true);
    loadCart(user?.id,supabase).then(items=>{if(active)setCartItems(items);}).catch(()=>showToast('Failed to load cart','error')).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[user?.id,userLoading,showToast]);
  const updateQuantity = async (productId,change) => {
    const item=cartItems.find(item=>item.productId===productId); const quantity=item.quantity+change;
    if(!validQuantity(quantity))return;
    setUpdateLoading(productId);
    try {
      const updated=cartItems.map(row=>row.productId===productId?{...row,quantity}:row);
      if(user){const {error}=await supabase.from('cart_items').update({quantity}).eq('product_id',productId).eq('user_id',user.id);if(error)throw error;}
      else writeGuestCart(updated.map(({productId,quantity})=>({productId,quantity})));
      setCartItems(updated);window.dispatchEvent(new Event('cart-changed'));
    }catch{showToast('Unable to update the cart.','error');}finally{setUpdateLoading(null);}
  };
  const removeItem = async productId => {
    setRemoveLoading(productId);
    try {
      const updated=cartItems.filter(row=>row.productId!==productId);
      if(user){const {error}=await supabase.from('cart_items').delete().eq('product_id',productId).eq('user_id',user.id);if(error)throw error;}
      else writeGuestCart(updated.map(({productId,quantity})=>({productId,quantity})));
      setCartItems(updated);window.dispatchEvent(new Event('cart-changed'));
    }catch{showToast('Unable to remove the item.','error');}finally{setRemoveLoading(null);}
  };
  const handlePlaceOrder = ()=>{if(cartItems.length)navigate('/checkout');else showToast('Your cart is empty.','error');};
  const calculateTotal=()=>cartItems.reduce((sum,item)=>sum+item.price*item.quantity,0);
  const calculateSubtotal=(price,quantity)=>price*quantity;
  const getTotalItems=()=>cartItems.reduce((sum,item)=>sum+item.quantity,0);
  if (userLoading) {
    return (
      <div className="cart-loading-container">
        <div className="cart-loading-spinner">
          <div className="cart-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <div className="cart-main-container">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <button
              onClick={() => navigate(-1)}
              className="cart-back-button"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 className="cart-title">Shopping Cart</h1>
              {!loading && cartItems.length > 0 && (
                <p className="cart-subtitle">{getTotalItems()} items in your cart</p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="cart-loading-container">
            <div className="cart-items-section">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-item">
                  <div className="skeleton-content">
                    <div className="skeleton-image"></div>
                    <div className="skeleton-text">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary-section">
              <div className="skeleton-summary">
                <div className="skeleton-summary-content">
                  <div className="skeleton-summary-line"></div>
                  <div className="skeleton-summary-line"></div>
                  <div className="skeleton-summary-line"></div>
                  <div className="skeleton-summary-button"></div>
                </div>
              </div>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart-container">
            <div className="empty-cart-card">
              <div className="empty-cart-icon">
                <ShoppingBag size={48} />
              </div>
              <h2 className="empty-cart-title">Your cart is empty</h2>
              <p className="empty-cart-description">
                Discover amazing products and add them to your cart to get started with your shopping journey.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="empty-cart-button"
              >
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Cart Items */}
            <div className="cart-items-section">
              <div className="cart-items-container">
                {cartItems.map(item => (
                  <div key={item.productId} className="cart-item">
                    <div className="cart-item-content">
                      <div className="cart-item-main">
                        <div className="cart-item-image-container">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="cart-item-image"
                            onError={(e) => {
                              e.target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                        <div className="cart-item-details">
                          <h3 className="cart-item-name">{item.name}</h3>
                          <p className="cart-item-price">
                            ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-controls">
                          <button
                            type="button"
                            className="quantity-button"
                            onClick={() => updateQuantity(item.productId, -1)}
                            disabled={item.quantity === 1 || updateLoading === item.productId}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus size={16} />
                          </button>
                          <div className="quantity-display">
                            {updateLoading === item.productId ? (
                              <div className="quantity-loading"></div>
                            ) : (
                              item.quantity
                            )}
                          </div>
                          <button
                            type="button"
                            className="quantity-button"
                            onClick={() => updateQuantity(item.productId, 1)}
                            disabled={updateLoading === item.productId}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="cart-item-subtotal-desktop">
                          <p className="cart-item-subtotal-text">
                            ₹{calculateSubtotal(item.price, item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeItem(item.productId)}
                          disabled={removeLoading === item.productId}
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          {removeLoading === item.productId ? (
                            <div className="remove-loading"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-subtotal-mobile">
                      <p className="cart-item-subtotal-text">
                        Subtotal: ₹{calculateSubtotal(item.price, item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="cart-summary-section">
              <div className="order-summary">
                <h2 className="order-summary-title">Order Summary</h2>
                <div className="order-summary-details">
                  <div className="summary-line">
                    <span className="summary-label">Subtotal ({getTotalItems()} items)</span>
                    <span className="summary-value">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="summary-line">
                    <span className="summary-label">Shipping</span>
                    <span className="summary-value-free">Free</span>
                  </div>
                  <div className="summary-line">
                    <span className="summary-label">Tax</span>
                    <span className="summary-value-muted">Calculated at checkout</span>
                  </div>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-total">
                  <span className="summary-total-label">Total</span>
                  <span className="summary-total-value">
                    ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  className="checkout-button"
                  onClick={handlePlaceOrder}
                  disabled={cartItems.length === 0}
                >
                  <Lock size={18} />
                  Proceed to Checkout
                </button>
                <div className="trust-badges">
                  <div className="trust-badge">
                    <Shield size={16} className="trust-icon" />
                    <span>Secure checkout</span>
                  </div>
                  <div className="trust-badge">
                    <Truck size={16} className="trust-icon" />
                    <span>Free shipping on all orders</span>
                  </div>
                </div>
                <div className="continue-shopping">
                  <button
                    onClick={() => navigate('/products')}
                    className="continue-shopping-link"
                  >
                    ← Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;