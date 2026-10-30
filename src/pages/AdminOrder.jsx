import { authenticatedFetch } from '../utils/api';
import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import "../styles/AdminOrder.css";
import { 
  Search, Calendar, Trash2, Eye, Package, CheckCircle, Clock, 
  AlertCircle, RefreshCw, X, ChevronDown, Truck, PackageCheck, 
  XCircle, User, MapPin, Phone, Mail, CreditCard, Filter, 
  ChevronLeft, ChevronRight, MoreVertical, ShoppingBag, Banknote
} from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATIONS
// ============================================
const STATUS_CONFIG = {
  order: {
    PROCESSING: { icon: Clock, color: 'processing', label: 'Processing' },
    SHIPPED: { icon: Truck, color: 'shipped', label: 'Shipped' },
    DELIVERED: { icon: PackageCheck, color: 'delivered', label: 'Delivered' },
    CANCELLED: { icon: XCircle, color: 'cancelled', label: 'Cancelled' }
  },
  payment: {
    SUCCESS: { icon: CheckCircle, color: 'success', label: 'Paid' },
    PENDING: { icon: Clock, color: 'pending', label: 'Pending' },
    FAILED: { icon: AlertCircle, color: 'failed', label: 'Failed' },
    COD_PENDING: { icon: Banknote, color: 'cod-pending', label: 'COD - Awaiting' }
  }
};

// COD Payment status options (what admin can update COD orders to)
const COD_PAYMENT_STATUSES = ['SUCCESS', 'COD_PENDING'];

const DATE_FILTERS = [
  { value: 'ALL', label: 'All Time', icon: Calendar },
  { value: 'TODAY', label: 'Today', icon: Calendar },
  { value: 'WEEK', label: 'Last 7 Days', icon: Calendar },
  { value: 'MONTH', label: 'Last 30 Days', icon: Calendar },
  { value: 'CUSTOM', label: 'Custom Range', icon: Calendar }
];

const ITEMS_PER_PAGE = 10;

// ============================================
// UTILITY FUNCTIONS
// ============================================
const normalizeStatus = (status) => {
  return status ? status.toString().toUpperCase().trim() : 'UNKNOWN';
};

const getStatusConfig = (type, status) => {
  const normalizedStatus = normalizeStatus(status);
  return STATUS_CONFIG[type]?.[normalizedStatus] || {
    icon: AlertCircle,
    color: 'unknown',
    label: normalizedStatus.charAt(0) + normalizedStatus.slice(1).toLowerCase()
  };
};

// Check if an order is a COD order (checks payment_id prefix)
const isCODOrder = (paymentId) => {
  return paymentId && paymentId.toString().startsWith('COD-');
};

// Check if payment status can be updated (only COD orders)
const canUpdatePaymentStatus = (paymentId) => {
  return isCODOrder(paymentId);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  return new Date(dateString).toLocaleDateString('en-IN', defaultOptions);
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

// Notification Component
const Notification = memo(({ notification, onClose }) => {
  if (!notification) return null;
  
  return (
    <div className={`apm-notification apm-notification--${notification.type}`} role="alert">
      <div className="apm-notification__icon">
        {notification.type === 'success' ? 
          <CheckCircle size={20} /> : 
          <AlertCircle size={20} />
        }
      </div>
      <span className="apm-notification__message">{notification.message}</span>
      <button 
        onClick={onClose} 
        className="apm-notification__close"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
});

// Loading Spinner Component
const LoadingSpinner = memo(({ message = 'Loading...' }) => (
  <div className="apm-loading">
    <div className="apm-loading__spinner">
      <RefreshCw size={32} className="apm-loading__icon" />
    </div>
    <span className="apm-loading__text">{message}</span>
  </div>
));

// Empty State Component
const EmptyState = memo(({ title, description, icon: Icon = Package }) => (
  <div className="apm-empty-state">
    <div className="apm-empty-state__icon">
      <Icon size={48} />
    </div>
    <h3 className="apm-empty-state__title">{title}</h3>
    <p className="apm-empty-state__description">{description}</p>
  </div>
));

// Stats Card Component
const StatsCard = memo(({ icon: Icon, label, value, color, onClick, isActive }) => (
  <button 
    className={`apm-stats-card apm-stats-card--${color} ${isActive ? 'apm-stats-card--active' : ''}`}
    onClick={onClick}
    type="button"
  >
    <div className="apm-stats-card__icon">
      <Icon size={22} />
    </div>
    <div className="apm-stats-card__content">
      <span className="apm-stats-card__value">{value}</span>
      <span className="apm-stats-card__label">{label}</span>
    </div>
  </button>
));

// Payment Status Badge (Read-only for non-COD orders)
const PaymentStatusBadge = memo(({ status }) => {
  const config = getStatusConfig('payment', status);
  const Icon = config.icon;

  return (
    <div 
      className={`apm-badge apm-badge--${config.color} apm-badge--readonly`}
      title={`Payment: ${config.label}`}
    >
      <Icon size={14} />
      <span>{config.label}</span>
    </div>
  );
});

// NEW: Payment Status Dropdown (Only for COD orders)
const PaymentStatusDropdown = memo(({ status, orderId, onUpdate, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  
  const config = getStatusConfig('payment', status);
  const Icon = config.icon;

  const handleStatusChange = useCallback((newStatus) => {
    onUpdate(orderId, newStatus);
    setIsOpen(false);
  }, [orderId, onUpdate]);

  const handleKeyDown = useCallback((e, newStatus) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleStatusChange(newStatus);
    }
  }, [handleStatusChange]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = useCallback((e, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    handleStatusChange(newStatus);
  }, [handleStatusChange]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (!isLoading) {
      setIsOpen(prev => !prev);
    }
  }, [isLoading]);

  return (
    <div 
      ref={dropdownRef}
      className={`apm-status-dropdown apm-status-dropdown--payment ${isOpen ? 'is-open' : ''}`}
    >
      <button 
        ref={triggerRef}
        className={`apm-badge apm-badge--${config.color} apm-badge--clickable apm-badge--cod ${isLoading ? 'apm-badge--loading' : ''}`}
        onClick={handleToggle}
        disabled={isLoading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
        title="Click to mark as paid"
      >
        <Icon size={14} />
        <span>{isLoading ? 'Updating...' : config.label}</span>
        {!isLoading && (
          <ChevronDown 
            size={14} 
            className={`apm-badge__chevron ${isOpen ? 'apm-badge__chevron--rotated' : ''}`} 
          />
        )}
      </button>
          
    {isOpen && (
      <div className="apm-status-dropdown__menu is-open" role="listbox">
        {COD_PAYMENT_STATUSES
          .filter(s => normalizeStatus(s) !== normalizeStatus(status))
          .map(s => {
            const statusConfig = getStatusConfig('payment', s);
            const StatusIcon = statusConfig.icon;
            return (
              <button
                key={s}
                onClick={(e) => handleItemClick(e, s)}
                onKeyDown={(e) => handleKeyDown(e, s)}
                disabled={isLoading}
                className={`apm-status-dropdown__item apm-status-dropdown__item--${statusConfig.color}`}
                role="option"
                type="button"
              >
                <StatusIcon size={16} />
                <span>Mark as {statusConfig.label}</span>
              </button>
            );
          })}
      </div>
    )}
    </div>
  );
});

// NEW: Smart Payment Status Component (Decides between Badge and Dropdown)
const PaymentStatus = memo(({ status, orderId, paymentId, onUpdate, isLoading }) => {
  // Only show dropdown for COD orders (can update anytime)
  if (canUpdatePaymentStatus(paymentId)) {
    return (
      <PaymentStatusDropdown
        status={status}
        orderId={orderId}
        onUpdate={onUpdate}
        isLoading={isLoading}
      />
    );
  }
  
  // Show read-only badge for online payment orders
  return <PaymentStatusBadge status={status} />;
});

// Order Status Dropdown
const OrderStatusDropdown = memo(({ status, orderId, onUpdate, isLoading, availableStatuses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  
  const config = getStatusConfig('order', status);
  const Icon = config.icon;

  const handleStatusChange = useCallback((newStatus) => {
    onUpdate(orderId, newStatus);
    setIsOpen(false);
  }, [orderId, onUpdate]);

  const handleKeyDown = useCallback((e, newStatus) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleStatusChange(newStatus);
    }
  }, [handleStatusChange]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    // Delay adding listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = useCallback((e, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    handleStatusChange(newStatus);
  }, [handleStatusChange]);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    if (!isLoading) {
      setIsOpen(prev => !prev);
    }
  }, [isLoading]);

  return (
    <div 
      ref={dropdownRef}
      className={`apm-status-dropdown ${isOpen ? 'is-open' : ''}`}
    >
      <button 
        ref={triggerRef}
        className={`apm-badge apm-badge--${config.color} apm-badge--clickable ${isLoading ? 'apm-badge--loading' : ''}`}
        onClick={handleToggle}
        disabled={isLoading}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        type="button"
      >
        <Icon size={14} />
        <span>{isLoading ? 'Updating...' : config.label}</span>
        {!isLoading && (
          <ChevronDown 
            size={14} 
            className={`apm-badge__chevron ${isOpen ? 'apm-badge__chevron--rotated' : ''}`} 
          />
        )}
      </button>
      
      {isOpen && (
        <div className="apm-status-dropdown__menu is-open" role="listbox">
          {availableStatuses
            .filter(s => normalizeStatus(s) !== normalizeStatus(status))
            .map(s => {
              const statusConfig = getStatusConfig('order', s);
              const StatusIcon = statusConfig.icon;
              return (
                <button
                  key={s}
                  onClick={(e) => handleItemClick(e, s)}
                  onKeyDown={(e) => handleKeyDown(e, s)}
                  disabled={isLoading}
                  className={`apm-status-dropdown__item apm-status-dropdown__item--${statusConfig.color}`}
                  role="option"
                  type="button"
                >
                  <StatusIcon size={16} />
                  <span>{statusConfig.label}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
});

// Order Card Component
const OrderCard = memo(({ 
  order, 
  isSelected, 
  onToggleSelect, 
  onViewDetails, 
  onDelete, 
  onUpdateStatus,
  onUpdatePaymentStatus, // NEW
  isUpdating,
  isUpdatingPayment // NEW
}) => {
  const totalAmount = useMemo(() => {
    if (!order.product_list || !Array.isArray(order.product_list)) return 0;
    return order.product_list.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [order.product_list]);

  const itemCount = order.product_list?.length || 0;
  const isCOD = isCODOrder(order.payment_id);

  return (
    <article className={`apm-order-card ${isSelected ? 'apm-order-card--selected' : ''} ${isCOD ? 'apm-order-card--cod' : ''}`}>
      {/* COD Badge */}
      {isCOD && (
        <div className="apm-order-card__cod-indicator">
          <Banknote size={14} />
          <span>Cash on Delivery</span>
        </div>
      )}

      <div className="apm-order-card__header">
        <div className="apm-order-card__selection">
          <label className="apm-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onToggleSelect(order.id, e)}
              aria-label={`Select order ${order.id}`}
            />
            <span className="apm-checkbox__mark"></span>
          </label>
        </div>
        
        <div className="apm-order-card__info">
          <h3 className="apm-order-card__id">
            <span className="apm-order-card__id-label">Order</span>
            <span className="apm-order-card__id-value">#{order.id}</span>
          </h3>
          <div className="apm-order-card__meta">
            <span className="apm-order-card__customer">
              <User size={14} />
              {order.user_name || 'Guest User'}
            </span>
            <span className="apm-order-card__date">
              <Calendar size={14} />
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>

        <div className="apm-order-card__status-group">
          {/* Smart Payment Status - Dropdown for COD, Badge for others */}
          <PaymentStatus
            status={order.payment_status}
            orderId={order.id}
            paymentId={order.payment_id}
            onUpdate={onUpdatePaymentStatus}
            isLoading={isUpdatingPayment}
          />
          <OrderStatusDropdown
            status={order.order_status}
            orderId={order.id}
            onUpdate={onUpdateStatus}
            isLoading={isUpdating}
            availableStatuses={Object.keys(STATUS_CONFIG.order)}
          />
        </div>
      </div>

      <div className="apm-order-card__body">
        <div className="apm-order-card__details">
          <div className="apm-order-card__detail">
            <Mail size={16} />
            <span>{order.user_email || 'No email'}</span>
          </div>
          <div className="apm-order-card__detail">
            <Phone size={16} />
            <span>{order.user_phone || 'No phone'}</span>
          </div>
          <div className="apm-order-card__detail">
            <MapPin size={16} />
            <span>
              {[order.city, order.state].filter(Boolean).join(', ') || 'No location'}
            </span>
          </div>
          {order.payment_id && (
            <div className="apm-order-card__detail">
              <CreditCard size={16} />
              <span className="apm-order-card__payment-id">{order.payment_id}</span>
            </div>
          )}
        </div>

        <div className="apm-order-card__summary">
          <div className="apm-order-card__items">
            <ShoppingBag size={18} />
            <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="apm-order-card__total">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      <div className="apm-order-card__actions">
        <button
          onClick={() => onViewDetails(order)}
          className="apm-btn apm-btn--secondary apm-btn--icon-text"
          aria-label={`View order ${order.id} details`}
          type="button"
        >
          <Eye size={16} />
          <span>View</span>
        </button>
        <button
          onClick={() => onDelete(order.id)}
          className="apm-btn apm-btn--danger apm-btn--icon-text"
          aria-label={`Delete order ${order.id}`}
          type="button"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>
    </article>
  );
});

// Order Details Modal
const OrderDetailsModal = memo(({ 
  order, 
  onClose, 
  onUpdateStatus,
  onUpdatePaymentStatus, // NEW
  isUpdating,
  isUpdatingPayment // NEW
}) => {
  // ✅ Move ALL hooks BEFORE any conditional returns
  
  const totalAmount = useMemo(() => {
    // Handle null/undefined order safely inside useMemo
    if (!order?.product_list || !Array.isArray(order.product_list)) return 0;
    return order.product_list.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [order?.product_list]); // Use optional chaining in dependency

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // Only add listeners if order exists
    if (!order) return;
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [order, handleKeyDown]); // Add order as dependency

  // ✅ NOW we can have conditional return (after all hooks)
  if (!order) return null;

  const isCOD = isCODOrder(order.payment_id);

  return (
    <div 
      className="apm-modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="apm-modal apm-modal--large">
        <header className="apm-modal__header">
          <h2 id="modal-title" className="apm-modal__title">
            <Package size={24} />
            Order #{order.id}
            {isCOD && (
              <span className="apm-modal__cod-badge">
                <Banknote size={16} />
                COD
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="apm-modal__close"
            aria-label="Close modal"
            type="button"
          >
            <X size={24} />
          </button>
        </header>
        
        <div className="apm-modal__body">
          {/* Customer Information */}
          <section className="apm-detail-section">
            <h3 className="apm-detail-section__title">
              <User size={18} />
              Customer Information
            </h3>
            <div className="apm-detail-grid">
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Name</span>
                <span className="apm-detail-item__value">{order.user_name || 'Guest User'}</span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Email</span>
                <span className="apm-detail-item__value">{order.user_email || 'N/A'}</span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Phone</span>
                <span className="apm-detail-item__value">{order.user_phone || 'N/A'}</span>
              </div>
              <div className="apm-detail-item apm-detail-item--full">
                <span className="apm-detail-item__label">Shipping Address</span>
                <span className="apm-detail-item__value">
                  {[
                    order.address_line,
                    order.city,
                    order.state,
                    order.postal_code
                  ].filter(Boolean).join(', ') || 'No address provided'}
                </span>
              </div>
            </div>
          </section>

          {/* Order Items */}
          {order.product_list && order.product_list.length > 0 && (
            <section className="apm-detail-section">
              <h3 className="apm-detail-section__title">
                <ShoppingBag size={18} />
                Order Items ({order.product_list.length})
              </h3>
              <div className="apm-product-list">
                <div className="apm-product-list__header">
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Price</span>
                </div>
                {order.product_list.map((item, index) => (
                  <div key={index} className="apm-product-list__item">
                    <span className="apm-product-list__name">
                      {item.name || 'Unknown Item'}
                    </span>
                    <span className="apm-product-list__qty">×{item.quantity || 1}</span>
                    <span className="apm-product-list__price">
                      {formatCurrency(item.total_price || 0)}
                    </span>
                  </div>
                ))}
                <div className="apm-product-list__total">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Status Management */}
          <section className="apm-detail-section">
            <h3 className="apm-detail-section__title">
              <Filter size={18} />
              Status Management
            </h3>
            <div className="apm-status-management">
              <div className="apm-status-group">
                <label className="apm-status-group__label">Payment Status</label>
                <div className="apm-status-group__content">
                  {/* Smart Payment Status */}
                  <PaymentStatus
                    status={order.payment_status}
                    orderId={order.id}
                    paymentId={order.payment_id}
                    onUpdate={onUpdatePaymentStatus}
                    isLoading={isUpdatingPayment}
                  />
                  <small className="apm-status-group__hint">
                    {isCOD 
                      ? 'Click to mark as paid when cash is received'
                      : 'Payment status is managed by the payment gateway'
                    }
                  </small>
                </div>
              </div>
              <div className="apm-status-group">
                <label className="apm-status-group__label">Order Status</label>
                <div className="apm-status-group__content">
                  <OrderStatusDropdown
                    status={order.order_status}
                    orderId={order.id}
                    onUpdate={onUpdateStatus}
                    isLoading={isUpdating}
                    availableStatuses={Object.keys(STATUS_CONFIG.order)}
                  />
                  <small className="apm-status-group__hint">
                    Click the badge to update order status
                  </small>
                </div>
              </div>
            </div>
          </section>

          {/* Order Metadata */}
          <section className="apm-detail-section">
            <h3 className="apm-detail-section__title">
              <CreditCard size={18} />
              Transaction Details
            </h3>
            <div className="apm-detail-grid">
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Order ID</span>
                <span className="apm-detail-item__value apm-detail-item__value--mono">
                  {order.id}
                </span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Payment ID</span>
                <span className="apm-detail-item__value apm-detail-item__value--mono">
                  {order.payment_id || 'N/A'}
                </span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Payment Method</span>
                <span className="apm-detail-item__value">
                  {order.payment_id?.startsWith('COD-') ? (
                    <span className="apm-payment-method apm-payment-method--cod">
                      <Banknote size={14} />
                      Cash on Delivery
                    </span>
                  ) : (
                    <span className="apm-payment-method apm-payment-method--online">
                      <CreditCard size={14} />
                      Online Payment
                    </span>
                  )}
                </span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Order Date</span>
                <span className="apm-detail-item__value">
                  {formatDateTime(order.created_at)}
                </span>
              </div>
              <div className="apm-detail-item">
                <span className="apm-detail-item__label">Guest Identifier</span>
                <span className="apm-detail-item__value apm-detail-item__value--mono">
                  {order.guest_identifier || 'N/A'}
                </span>
              </div>
            </div>
          </section>
        </div>

        <footer className="apm-modal__footer">
          <button 
            onClick={onClose}
            className="apm-btn apm-btn--secondary"
            type="button"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
});

// Delete Confirmation Modal
const DeleteConfirmModal = memo(({ orderId, onConfirm, onCancel }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
      className="apm-modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="apm-modal apm-modal--small">
        <header className="apm-modal__header apm-modal__header--danger">
          <h2 id="delete-modal-title" className="apm-modal__title">
            <AlertCircle size={24} />
            Confirm Deletion
          </h2>
          <button 
            onClick={onCancel}
            className="apm-modal__close"
            aria-label="Close modal"
            type="button"
          >
            <X size={24} />
          </button>
        </header>
        
        <div className="apm-modal__body">
          <div className="apm-confirm-content">
            <div className="apm-confirm-icon">
              <Trash2 size={48} />
            </div>
            <p className="apm-confirm-message">
              Are you sure you want to delete <strong>Order #{orderId}</strong>?
            </p>
            <p className="apm-confirm-warning">
              This action cannot be undone. All order data will be permanently removed.
            </p>
          </div>
        </div>

        <footer className="apm-modal__footer">
          <button 
            onClick={onCancel}
            className="apm-btn apm-btn--secondary"
            type="button"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(orderId)}
            className="apm-btn apm-btn--danger"
            type="button"
          >
            <Trash2 size={16} />
            Delete Order
          </button>
        </footer>
      </div>
    </div>
  );
});

// Pagination Component
const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <nav className="apm-pagination" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="apm-pagination__btn apm-pagination__btn--prev"
        aria-label="Previous page"
        type="button"
      >
        <ChevronLeft size={18} />
        <span>Previous</span>
      </button>
      
      <div className="apm-pagination__pages">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="apm-pagination__ellipsis">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`apm-pagination__page ${currentPage === page ? 'apm-pagination__page--active' : ''}`}
              aria-current={currentPage === page ? 'page' : undefined}
              type="button"
            >
              {page}
            </button>
          )
        ))}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="apm-pagination__btn apm-pagination__btn--next"
        aria-label="Next page"
        type="button"
      >
        <span>Next</span>
        <ChevronRight size={18} />
      </button>
    </nav>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================
export default function AdminProductManagement() {
  // Core state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [updatingPayments, setUpdatingPayments] = useState(new Set()); // NEW: Track payment updates
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    payment: 'ALL',
    dateRange: 'ALL',
    customDate: { start: '', end: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Modal state
  const [modals, setModals] = useState({
    orderDetails: { show: false, order: null },
    deleteConfirm: { show: false, orderId: null },
    notification: null
  });

  const navigate = useNavigate();

  // ============================================
  // AUTHENTICATION
  // ============================================
  const checkAdmin = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        navigate('/auth');
        return false;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileErr || profile?.role !== 'admin') {
        navigate('/');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      navigate('/auth');
      return false;
    }
  }, [navigate]);

  // ============================================
  // DATA FETCHING
  // ============================================
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, user_id, user_name, user_email, user_phone,
          address_line, city, state, postal_code, product_list,
          payment_id, payment_status, order_status, created_at, guest_identifier
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('Failed to load orders. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================
  const showNotification = useCallback((message, type = 'success') => {
    setModals(prev => ({ ...prev, notification: { message, type } }));
    const timer = setTimeout(() => {
      setModals(prev => ({ ...prev, notification: null }));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const closeNotification = useCallback(() => {
    setModals(prev => ({ ...prev, notification: null }));
  }, []);

  // ============================================
  // FILTERING LOGIC
  // ============================================
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const searchFields = [
          order.user_name,
          order.user_email,
          order.id?.toString(),
          order.payment_id,
          order.user_phone,
          order.city,
          order.state
        ];
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      });
    }

    // Order status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(order => 
        normalizeStatus(order.order_status) === filters.status
      );
    }
    
    // Payment status filter
    if (filters.payment !== 'ALL') {
      filtered = filtered.filter(order => 
        normalizeStatus(order.payment_status) === filters.payment
      );
    }

    // Date filter
    if (filters.dateRange !== 'ALL') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      switch (filters.dateRange) {
        case 'TODAY': {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= today
          );
          break;
        }
        case 'WEEK': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= weekAgo
          );
          break;
        }
        case 'MONTH': {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= monthAgo
          );
          break;
        }
        case 'CUSTOM': {
          if (filters.customDate.start && filters.customDate.end) {
            const startDate = new Date(filters.customDate.start);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.customDate.end);
            endDate.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter(order => {
              const orderDate = new Date(order.created_at);
              return orderDate >= startDate && orderDate <= endDate;
            });
          }
          break;
        }
        default:
          break;
      }
    }

    return filtered;
  }, [orders, filters]);

  // ============================================
  // ANALYTICS
  // ============================================
  const analytics = useMemo(() => {
    const statusCounts = filteredOrders.reduce((acc, order) => {
      const normalizedStatus = normalizeStatus(order.order_status);
      acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
      return acc;
    }, {});

  // Count COD orders with pending payment
  const codPendingCount = filteredOrders.filter(order => 
    isCODOrder(order.payment_id) && normalizeStatus(order.payment_status) === 'COD_PENDING'
  ).length;

    const totalRevenue = filteredOrders.reduce((total, order) => {
      if (order.product_list && Array.isArray(order.product_list)) {
        return total + order.product_list.reduce((sum, item) => 
          sum + (item.total_price || 0), 0
        );
      }
      return total;
    }, 0);

    const groupedOrders = filteredOrders.reduce((groups, order) => {
      const date = new Date(order.created_at);
      const monthYear = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(order);
      return groups;
    }, {});

    return { statusCounts, totalRevenue, groupedOrders, codPendingCount };
  }, [filteredOrders]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ============================================
  // FILTER HANDLERS
  // ============================================
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'dateRange') {
      setShowCustomDatePicker(value === 'CUSTOM');
      if (value !== 'CUSTOM') {
        setFilters(prev => ({ 
          ...prev, 
          customDate: { start: '', end: '' } 
        }));
      }
    }
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'ALL',
      payment: 'ALL',
      dateRange: 'ALL',
      customDate: { start: '', end: '' }
    });
    setShowCustomDatePicker(false);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' || 
           filters.status !== 'ALL' || 
           filters.payment !== 'ALL' || 
           filters.dateRange !== 'ALL';
  }, [filters]);

  // ============================================
  // ORDER STATUS UPDATE
  // ============================================
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    setUpdatingOrders(prev => new Set([...prev, orderId]));

    try {
      const statusValue = newStatus.toLowerCase();
      const { error } = await supabase
        .from('orders')
        .update({ order_status: statusValue })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, order_status: statusValue } 
          : order
      ));

      // Update modal order if open
      setModals(prev => ({
        ...prev,
        orderDetails: prev.orderDetails.order?.id === orderId 
          ? { 
              ...prev.orderDetails, 
              order: { ...prev.orderDetails.order, order_status: statusValue } 
            }
          : prev.orderDetails
      }));

      showNotification(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      showNotification('Failed to update order status', 'error');
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }, [showNotification]);

  // ============================================
  // NEW: PAYMENT STATUS UPDATE (COD ONLY)
  // ============================================
  const updatePaymentStatus = useCallback(async (orderId, newStatus) => {
    // Find the order to check if it's COD
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      showNotification('Order not found', 'error');
      return;
    }

    // Verify this is a COD order
    if (!isCODOrder(order.payment_id)) {
      showNotification('Payment status can only be updated for COD orders', 'error');
      return;
    }

    setUpdatingPayments(prev => new Set([...prev, orderId]));

    try {
      await authenticatedFetch('/api/cod-payment', { method: 'POST', body: JSON.stringify({orderId, status:newStatus.toUpperCase()}) });

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, payment_status: newStatus.toUpperCase() } 
          : order
      ));

      // Update modal order if open
      setModals(prev => ({
        ...prev,
        orderDetails: prev.orderDetails.order?.id === orderId 
          ? { 
              ...prev.orderDetails, 
              order: { ...prev.orderDetails.order, payment_status: newStatus.toUpperCase() } 
            }
          : prev.orderDetails
      }));

      showNotification(`Payment received! Status updated to Paid`, 'success');
    } catch (error) {
      console.error('Error updating payment status:', error);
      showNotification('Failed to update payment status', 'error');
    } finally {
      setUpdatingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }, [orders, showNotification]);

  // ============================================
  // DELETE HANDLERS
  // ============================================
  const deleteOrder = useCallback(async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== orderId));
      setSelectedOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });

      if (modals.orderDetails.order?.id === orderId) {
        setModals(prev => ({ 
          ...prev, 
          orderDetails: { show: false, order: null } 
        }));
      }

      showNotification('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification('Failed to delete order', 'error');
    }
    
    setModals(prev => ({ 
      ...prev, 
      deleteConfirm: { show: false, orderId: null } 
    }));
  }, [modals.orderDetails.order?.id, showNotification]);

  const bulkDeleteOrders = useCallback(async () => {
    if (selectedOrders.size === 0) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', Array.from(selectedOrders));

      if (error) throw error;

      setOrders(prev => prev.filter(order => !selectedOrders.has(order.id)));
      setSelectedOrders(new Set());
      showNotification(`${selectedOrders.size} orders deleted successfully`);
    } catch (error) {
      console.error('Error deleting orders:', error);
      showNotification('Failed to delete orders', 'error');
    }
  }, [selectedOrders, showNotification]);

  // ============================================
  // SELECTION HANDLERS
  // ============================================
  const toggleOrderSelection = useCallback((orderId, event) => {
    event.stopPropagation();
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const selectAllOrders = useCallback(() => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(order => order.id)));
    }
  }, [selectedOrders.size, paginatedOrders]);

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const openOrderDetails = useCallback((order) => {
    setModals(prev => ({ 
      ...prev, 
      orderDetails: { show: true, order } 
    }));
  }, []);

  const closeOrderDetails = useCallback(() => {
    setModals(prev => ({ 
      ...prev, 
      orderDetails: { show: false, order: null } 
    }));
  }, []);

  const openDeleteConfirm = useCallback((orderId) => {
    setModals(prev => ({ 
      ...prev, 
      deleteConfirm: { show: true, orderId } 
    }));
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setModals(prev => ({ 
      ...prev, 
      deleteConfirm: { show: false, orderId: null } 
    }));
  }, []);

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    const init = async () => {
      if (await checkAdmin()) {
        await loadOrders();
      }
    };
    init();
  }, [checkAdmin, loadOrders]);

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  return (
    <div className="apm-container">
      {/* Notification */}
      <Notification 
        notification={modals.notification} 
        onClose={closeNotification} 
      />

      {/* Header */}
      <header className="apm-header">
        <div className="apm-header__main">
          <div className="apm-header__title-group">
            <h1 className="apm-header__title">
              <Package size={28} />
              Order Management
            </h1>
            <div className="apm-header__stats">
              <span className="apm-header__stat">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </span>
              <span className="apm-header__stat apm-header__stat--highlight">
                {formatCurrency(analytics.totalRevenue)} revenue
              </span>
              {analytics.statusCounts.PROCESSING > 0 && (
                <span className="apm-header__stat apm-header__stat--warning">
                  {analytics.statusCounts.PROCESSING} processing
                </span>
              )}
              {/* NEW: COD Pending indicator */}
              {analytics.codPendingCount > 0 && (
                <span className="apm-header__stat apm-header__stat--cod">
                  <Banknote size={14} />
                  {analytics.codPendingCount} COD awaiting payment
                </span>
              )}
            </div>
          </div>
          
          <div className="apm-header__actions">
            <button 
              onClick={loadOrders} 
              className="apm-btn apm-btn--secondary"
              type="button"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
            
            {selectedOrders.size > 0 && (
              <div className="apm-header__bulk-actions">
                <button 
                  onClick={selectAllOrders} 
                  className="apm-btn apm-btn--secondary"
                  type="button"
                >
                  {selectedOrders.size === paginatedOrders.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={bulkDeleteOrders} 
                  className="apm-btn apm-btn--danger"
                  type="button"
                >
                  <Trash2 size={18} />
                  <span>Delete ({selectedOrders.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="apm-stats-grid" aria-label="Order statistics">
        {Object.entries(STATUS_CONFIG.order).map(([status, config]) => (
          <StatsCard
            key={status}
            icon={config.icon}
            label={config.label}
            value={analytics.statusCounts[status] || 0}
            color={config.color}
            onClick={() => updateFilter('status', filters.status === status ? 'ALL' : status)}
            isActive={filters.status === status}
          />
        ))}
      </section>

      {/* Filters */}
      <section className="apm-filters">
        <div className="apm-filters__main">
          <div className="apm-search">
            <Search size={20} className="apm-search__icon" />
            <input
              type="text"
              placeholder="Search by order ID, customer, phone, city..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="apm-search__input"
              aria-label="Search orders"
            />
            {filters.search && (
              <button 
                onClick={() => updateFilter('search', '')}
                className="apm-search__clear"
                aria-label="Clear search"
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`apm-btn apm-btn--filter ${showFilters ? 'apm-btn--filter-active' : ''} ${hasActiveFilters ? 'apm-btn--has-filters' : ''}`}
            type="button"
          >
            <Filter size={18} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="apm-btn__badge">
                {[filters.status !== 'ALL', filters.payment !== 'ALL', filters.dateRange !== 'ALL'].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="apm-btn apm-btn--ghost"
              type="button"
            >
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="apm-filters__panel">
            <div className="apm-filter-group">
              <label className="apm-filter-group__label">Order Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="apm-select"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(STATUS_CONFIG.order).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="apm-filter-group">
              <label className="apm-filter-group__label">Payment Status</label>
              <select
                value={filters.payment}
                onChange={(e) => updateFilter('payment', e.target.value)}
                className="apm-select"
              >
                <option value="ALL">All Payments</option>
                {Object.entries(STATUS_CONFIG.payment).map(([status, config]) => (
                  <option key={status} value={status}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="apm-filter-group">
              <label className="apm-filter-group__label">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="apm-select"
              >
                {DATE_FILTERS.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {showCustomDatePicker && (
              <div className="apm-filter-group apm-filter-group--date-range">
                <label className="apm-filter-group__label">Custom Date Range</label>
                <div className="apm-date-picker">
                  <input
                    type="date"
                    value={filters.customDate.start}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      customDate: { ...prev.customDate, start: e.target.value }
                    }))}
                    className="apm-date-input"
                    aria-label="Start date"
                  />
                  <span className="apm-date-picker__separator">to</span>
                  <input
                    type="date"
                    value={filters.customDate.end}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      customDate: { ...prev.customDate, end: e.target.value }
                    }))}
                    className="apm-date-input"
                    aria-label="End date"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Orders List */}
      <main className="apm-orders">
        {paginatedOrders.length === 0 ? (
          <EmptyState 
            title="No orders found"
            description={hasActiveFilters 
              ? "Try adjusting your filters or search terms." 
              : "Orders will appear here once customers place them."
            }
            icon={Package}
          />
        ) : (
          <>
            <div className="apm-orders__list">
              {paginatedOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrders.has(order.id)}
                  onToggleSelect={toggleOrderSelection}
                  onViewDetails={openOrderDetails}
                  onDelete={openDeleteConfirm}
                  onUpdateStatus={updateOrderStatus}
                  onUpdatePaymentStatus={updatePaymentStatus}
                  isUpdating={updatingOrders.has(order.id)}
                  isUpdatingPayment={updatingPayments.has(order.id)}
                />
              ))}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {modals.orderDetails.show && (
        <OrderDetailsModal
          order={modals.orderDetails.order}
          onClose={closeOrderDetails}
          onUpdateStatus={updateOrderStatus}
          onUpdatePaymentStatus={updatePaymentStatus}
          isUpdating={updatingOrders.has(modals.orderDetails.order?.id)}
          isUpdatingPayment={updatingPayments.has(modals.orderDetails.order?.id)}
        />
      )}

      {modals.deleteConfirm.show && (
        <DeleteConfirmModal
          orderId={modals.deleteConfirm.orderId}
          onConfirm={deleteOrder}
          onCancel={closeDeleteConfirm}
        />
      )}
    </div>
  );
}
