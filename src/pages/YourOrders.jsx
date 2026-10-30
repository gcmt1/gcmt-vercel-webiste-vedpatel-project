import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../AppContext';
import { 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  CreditCard, 
  Truck, 
  Check, 
  Clock, 
  AlertCircle,
  Eye,
  X,
  Download,
  ChevronRight,
  User,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import styles from '../styles/YourOrders.module.css';


const YourOrders = () => {
  const { user } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) {
      setSessionChecked(true);
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      
      // Fetch orders based on actual database structure from checkout
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again later.');
    } finally {
      setSessionChecked(true);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <Check className={styles.statusIconGreen} />;
      case 'shipped':
      case 'out_for_delivery':
        return <Truck className={styles.statusIconBlue} />;
      case 'processing':
      case 'confirmed':
        return <Clock className={styles.statusIconYellow} />;
      case 'cancelled':
        return <XCircle className={styles.statusIconRed} />;
      case 'returned':
        return <RefreshCw className={styles.statusIconOrange} />;
      default:
        return <Package className={styles.statusIconGray} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return styles.statusDelivered;
      case 'shipped':
      case 'out_for_delivery':
        return styles.statusShipped;
      case 'processing':
      case 'confirmed':
        return styles.statusProcessing;
      case 'cancelled':
        return styles.statusCancelled;
      case 'returned':
        return styles.statusReturned;
      default:
        return styles.statusDefault;
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'paid':
        return <CheckCircle className={styles.paymentIconGreen} />;
      case 'cash_on_delivery':
        return <Package className={styles.paymentIconOrange} />;
      case 'pending':
        return <Clock className={styles.paymentIconYellow} />;
      case 'failed':
      case 'cancelled':
        return <XCircle className={styles.paymentIconRed} />;
      default:
        return <AlertCircle className={styles.paymentIconGray} />;
    }
  };

  const getPaymentModeDisplay = (paymentStatus) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'cash_on_delivery':
        return 'Cash on Delivery';
      case 'success':
      case 'completed':
      case 'paid':
        return 'Online Payment';
      case 'pending':
        return 'Payment Pending';
      default:
        return paymentStatus || 'Not specified';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowModal(false);
  };

  const getOrderSummary = (productList) => {
    if (!Array.isArray(productList) || productList.length === 0) {
      return 'No items listed';
    }
    
    const totalItems = productList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const firstItem = productList[0];
    
    if (productList.length === 1) {
      return `${firstItem.name} (${firstItem.quantity})`;
    } else {
      return `${firstItem.name} and ${productList.length - 1} other item${productList.length > 2 ? 's' : ''} (${totalItems} total)`;
    }
  };

  const getDeliveryEstimate = (order) => {
    if (order.estimated_delivery_date) {
      return `Expected by ${formatDate(order.estimated_delivery_date)}`;
    }
    if (order.order_status?.toLowerCase() === 'delivered' && order.delivered_at) {
      return `Delivered on ${formatDate(order.delivered_at)}`;
    }
    if (order.order_status?.toLowerCase() === 'shipped') {
      return 'Package is on the way';
    }
    if (order.order_status?.toLowerCase() === 'confirmed') {
      return 'Order confirmed, preparing for shipment';
    }
    return 'Processing your order';
  };

  const refreshOrders = () => {
    fetchOrders();
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading your orders...</p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!user && sessionChecked) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <Package className={styles.largeIcon} />
          <h2 className={styles.messageTitle}>Sign In Required</h2>
          <p className={styles.messageText}>Please log in to view your order history.</p>
          <a href="/login" className={styles.primaryButton}>
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <AlertCircle className={styles.largeIconRed} />
          <h2 className={styles.messageTitle}>Something went wrong</h2>
          <p className={styles.messageText}>{error}</p>
          <button onClick={refreshOrders} className={styles.primaryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className={styles.centeredContainer}>
        <div className={styles.messageCard}>
          <ShoppingBag className={styles.largeIcon} />
          <h2 className={styles.messageTitle}>No Orders Yet</h2>
          <p className={styles.messageText}>You haven't placed any orders yet. Start shopping to see your orders here.</p>
          <a href="/products" className={styles.primaryButton}>
            Start Shopping
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Your Orders</h1>
            <p className={styles.pageSubtitle}>Track and manage your order history</p>
          </div>
          <div className={styles.headerRight}>
            <button 
              onClick={refreshOrders} 
              className={styles.refreshButton}
              disabled={refreshing}
            >
              <RefreshCw className={`${styles.smallIcon} ${refreshing ? styles.spinning : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Orders List */}
        <div className={styles.ordersContainer}>
          {orders.map((order) => (
            <div key={order.id} className={styles.enhancedOrderCard}>
              {/* Order Card Header */}
              <div className={styles.orderCardHeader}>
                <div className={styles.orderIdentification}>
                  <h3 className={styles.orderNumber}>
                    Order #{String(order.id ?? '').slice(-8) || 'N/A'}
                  </h3>
                  <div className={styles.orderDate}>
                    <Calendar className={styles.smallIcon} />
                    {formatDate(order.created_at)}
                  </div>
                </div>
                
                <div className={styles.orderStatusGroup}>
                  <div className={styles.orderStatus}>
                    {getStatusIcon(order.order_status)}
                    <span className={`${styles.statusBadge} ${getStatusClass(order.order_status)}`}>
                      {order.order_status?.replace('_', ' ').toUpperCase() || 'PROCESSING'}
                    </span>
                  </div>
                  <div className={styles.paymentStatus}>
                    {getPaymentStatusIcon(order.payment_status)}
                    <span className={styles.paymentStatusText}>
                      {getPaymentModeDisplay(order.payment_status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Card Content */}
              <div className={styles.orderCardContent}>
                <div className={styles.orderSummarySection}>
                  <div className={styles.itemsSummary}>
                    <Package className={styles.smallIcon} />
                    <span className={styles.itemsText}>
                      {getOrderSummary(order.product_list)}
                    </span>
                  </div>
                  
                  <div className={styles.orderMetrics}>
                    <div className={styles.totalAmount}>
                      <span className={styles.totalLabel}>Total:</span>
                      <span className={styles.totalValue}>
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.deliveryInfo}>
                  <div className={styles.deliveryStatus}>
                    <Truck className={styles.smallIcon} />
                    <span className={styles.deliveryText}>
                      {getDeliveryEstimate(order)}
                    </span>
                  </div>
                  
                  {order.tracking_number && (
                    <div className={styles.trackingInfo}>
                      <span className={styles.trackingLabel}>Tracking:</span>
                      <span className={styles.trackingNumber}>{order.tracking_number}</span>
                    </div>
                  )}
                </div>

                <div className={styles.orderActions}>
                  <button
                    onClick={() => openOrderDetails(order)}
                    className={styles.viewDetailsBtn}
                  >
                    <Eye className={styles.smallIcon} />
                    View Full Details
                    <ChevronRight className={styles.smallIcon} />
                  </button>
                  
                  {order.order_status?.toLowerCase() === 'shipped' && order.tracking_number && (
                    <button
                      onClick={() => window.open(`/track/${order.tracking_number}`, '_blank')}
                      className={styles.trackOrderBtn}
                    >
                      <Truck className={styles.smallIcon} />
                      Track Package
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.pageFooter}>
          <p className={styles.footerText}>Need help with your order?</p>
          <a href="/contact" className={styles.secondaryButton}>
            Contact Support
          </a>
        </div>
      </div>

      {/* Enhanced Order Details Modal */}
      {showModal && selectedOrder && (
        <div className={styles.modalOverlay} onClick={closeOrderDetails}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Package className={styles.orderIcon} />
                <div>
                  <h2>Order #{String(selectedOrder.id ?? '').slice(-8) || 'N/A'}</h2>
                  <p className={styles.modalSubtitle}>
                    Placed on {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
              </div>
              <div className={styles.modalHeaderRight}>
                <div className={styles.modalStatusGroup}>
                  <div className={styles.modalStatus}>
                    {getStatusIcon(selectedOrder.order_status)}
                    <span className={`${styles.statusBadge} ${getStatusClass(selectedOrder.order_status)}`}>
                      {selectedOrder.order_status?.replace('_', ' ').toUpperCase() || 'PROCESSING'}
                    </span>
                  </div>
                  <div className={styles.modalPaymentStatus}>
                    {getPaymentStatusIcon(selectedOrder.payment_status)}
                    <span className={styles.paymentStatusBadge}>
                      {getPaymentModeDisplay(selectedOrder.payment_status)}
                    </span>
                  </div>
                </div>
                <button onClick={closeOrderDetails} className={styles.closeButton}>
                  <X className={styles.smallIcon} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.modalGrid}>
                {/* Left Column */}
                <div className={styles.modalColumn}>
                  {/* Order Items */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <Package className={styles.smallIcon} />
                      Items Ordered
                    </h4>
                    <div className={styles.itemsList}>
                      {(selectedOrder.product_list || []).map((item, index) => (
                        <div key={index} className={styles.orderItem}>
                          <div className={styles.itemDetails}>
                            <h5 className={styles.itemName}>
                              {item.name || 'Product'}
                            </h5>
                            <div className={styles.itemMeta}>
                              <span>Quantity: {item.quantity || 0}</span>
                              <span>Unit Price: {formatCurrency(item.unit_price || 0)}</span>
                              <span className={styles.itemTotal}>
                                Total: {formatCurrency(item.total_price || 0)}
                              </span>
                            </div>
                            {item.product_id && (
                              <div className={styles.itemProductId}>
                                Product ID: {item.product_id}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <CreditCard className={styles.smallIcon} />
                      Payment Details
                    </h4>
                    <div className={styles.paymentDetailsGrid}>
                      <div className={styles.paymentRow}>
                        <span className={styles.paymentLabel}>Payment Method:</span>
                        <span className={styles.paymentValue}>
                          {getPaymentModeDisplay(selectedOrder.payment_status)}
                        </span>
                      </div>
                      
                      {selectedOrder.payment_id && (
                        <div className={styles.paymentRow}>
                          <span className={styles.paymentLabel}>Payment ID:</span>
                          <span className={styles.paymentValue}>{selectedOrder.payment_id}</span>
                        </div>
                      )}
                      
                      <div className={styles.paymentRow}>
                        <span className={styles.paymentLabel}>Status:</span>
                        <span className={`${styles.paymentValue} ${styles.paymentStatusValue}`}>
                          {getPaymentStatusIcon(selectedOrder.payment_status)}
                          {selectedOrder.payment_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>

                      <div className={`${styles.paymentRow} ${styles.totalRow}`}>
                        <span className={styles.paymentLabelBold}>Total Amount:</span>
                        <span className={styles.paymentValueBold}>
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className={styles.modalColumn}>
                  {/* Delivery Information */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <Truck className={styles.smallIcon} />
                      Delivery Information
                    </h4>
                    <div className={styles.deliveryDetails}>
                      <div className={styles.deliveryRow}>
                        <span className={styles.deliveryLabel}>Status:</span>
                        <span className={styles.deliveryValue}>
                          {getStatusIcon(selectedOrder.order_status)}
                          {selectedOrder.order_status?.replace('_', ' ').toUpperCase() || 'PROCESSING'}
                        </span>
                      </div>
                      
                      {selectedOrder.tracking_number && (
                        <div className={styles.deliveryRow}>
                          <span className={styles.deliveryLabel}>Tracking Number:</span>
                          <span className={styles.trackingNumberValue}>{selectedOrder.tracking_number}</span>
                        </div>
                      )}

                      {selectedOrder.estimated_delivery_date && (
                        <div className={styles.deliveryRow}>
                          <span className={styles.deliveryLabel}>Expected Delivery:</span>
                          <span className={styles.deliveryValue}>{formatDate(selectedOrder.estimated_delivery_date)}</span>
                        </div>
                      )}

                      {selectedOrder.shipped_at && (
                        <div className={styles.deliveryRow}>
                          <span className={styles.deliveryLabel}>Shipped On:</span>
                          <span className={styles.deliveryValue}>{formatDate(selectedOrder.shipped_at)}</span>
                        </div>
                      )}

                      {selectedOrder.delivered_at && (
                        <div className={styles.deliveryRow}>
                          <span className={styles.deliveryLabel}>Delivered On:</span>
                          <span className={styles.deliveryValue}>{formatDate(selectedOrder.delivered_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <MapPin className={styles.smallIcon} />
                      Shipping Address
                    </h4>
                    <div className={styles.addressBox}>
                      <div className={styles.addressText}>
                        {selectedOrder.user_name && (
                          <div className={styles.addressName}>{selectedOrder.user_name}</div>
                        )}
                        {selectedOrder.address_line && <div>{selectedOrder.address_line}</div>}
                        <div>
                          {selectedOrder.city && `${selectedOrder.city}, `}
                          {selectedOrder.state && `${selectedOrder.state} `}
                          {selectedOrder.postal_code}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                      <User className={styles.smallIcon} />
                      Customer Details
                    </h4>
                    <div className={styles.customerDetails}>
                      {selectedOrder.user_name && (
                        <div className={styles.customerRow}>
                          <User className={styles.smallIcon} />
                          <span>{selectedOrder.user_name}</span>
                        </div>
                      )}
                      
                      {selectedOrder.user_email && (
                        <div className={styles.customerRow}>
                          <Mail className={styles.smallIcon} />
                          <span>{selectedOrder.user_email}</span>
                        </div>
                      )}
                      
                      {selectedOrder.user_phone && (
                        <div className={styles.customerRow}>
                          <Phone className={styles.smallIcon} />
                          <span>{selectedOrder.user_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className={styles.modalActionsSection}>
                    <div className={styles.modalActionButtons}>
                      <button
                        onClick={async () => { try { const { generateInvoicePDF } = await import('../components/InvoiceGenerator'); await generateInvoicePDF(selectedOrder); } catch { window.alert('The invoice could not be generated. Please try again.'); } }}
                        className={styles.invoiceButton}
                      >
                        <Download className={styles.smallIcon} />
                        Download Invoice
                      </button>
                      
                      {selectedOrder.tracking_number && (
                        <button
                          onClick={() => window.open(`/track/${selectedOrder.tracking_number}`, '_blank')}
                          className={styles.trackButton}
                        >
                          <Truck className={styles.smallIcon} />
                          Track Package
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourOrders;