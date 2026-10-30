import { csvContent } from '../utils/security';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft,
  Mail,
  Users,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import '../styles/AdminSubscription.css';

export default function AdminSubscription() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  // Show notification helper
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Memoized filtered list - MUST BE DEFINED BEFORE exportToCSV
  const filtered = useMemo(() => {
    let list = [...subscriptions];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((s) => s.email?.toLowerCase().includes(term));
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateFilter) {
        case '7days':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoff.setDate(now.getDate() - 90);
          break;
        default:
          break;
      }
      
      list = list.filter((s) => new Date(s.created_at) >= cutoff);
    }
    
    return list;
  }, [subscriptions, searchTerm, dateFilter]);

  // Memoized stats calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = subscriptions.filter((s) => {
      const d = new Date(s.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonth = subscriptions.filter((s) => {
      const d = new Date(s.created_at);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).length;

    let growthRate = '—';
    if (lastMonth > 0) {
      const rate = ((thisMonth - lastMonth) / lastMonth) * 100;
      growthRate = `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
    } else if (thisMonth > 0) {
      growthRate = '+100%';
    }

    return {
      total: subscriptions.length,
      thisMonth,
      growthRate,
      isPositiveGrowth: thisMonth >= lastMonth
    };
  }, [subscriptions]);

  // Verify admin session and role
  const verifyAdmin = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();
      
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
      console.error('Admin verification failed:', error);
      navigate('/auth');
      return false;
    }
  }, [navigate]);

  // Load subscription records
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      showNotification('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    (async () => {
      if (await verifyAdmin()) {
        await fetchSubscriptions();
      }
    })();
  }, [verifyAdmin, fetchSubscriptions]);

  // Delete single subscription
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      showNotification('Subscriber deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification('Failed to delete subscriber', 'error');
    } finally {
      setDeletingId(null);
      setShowDeleteModal(false);
    }
  };

  // Bulk delete selected subscriptions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .delete()
        .in('id', selectedIds);
      
      if (error) throw error;
      
      setSubscriptions((prev) => prev.filter((sub) => !selectedIds.includes(sub.id)));
      showNotification(`${selectedIds.length} subscriber(s) deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      showNotification('Failed to delete subscribers', 'error');
    }
  };

  // Export filtered subscriptions to CSV - NOW DEFINED AFTER filtered
  const exportToCSV = useCallback(() => {
    if (filtered.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }
    
    const rows = [
      ['Email', 'Subscription Date', 'Status'],
      ...filtered.map((sub) => [
        sub.email,
        new Date(sub.created_at).toLocaleDateString(),
        'Active'
      ])
    ];
    
    const csv = csvContent(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Exported ${filtered.length} subscriber(s)`);
  }, [filtered, showNotification]);

  // Refresh list
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptions();
    setRefreshing(false);
    showNotification('Data refreshed successfully');
  };

  // Selection handlers
  const toggleSelectAll = useCallback((checked) => {
    setSelectedIds(checked ? filtered.map((s) => s.id) : []);
  }, [filtered]);

  const toggleSelectOne = useCallback((id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  }, []);

  // Check if all filtered items are selected
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Loading state
  if (loading) {
    return (
      <div className="admin-subscription-page">
        <div className="admin-subscription-loading">
          <div className="admin-subscription-loading-spinner">
            <RefreshCw className="admin-subscription-spin" size={32} />
          </div>
          <p className="admin-subscription-loading-text">Loading subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-subscription-page">
      <div className="admin-subscription-container">
        
        {/* Notification Toast */}
        {notification && (
          <div className={`admin-subscription-toast admin-subscription-toast-${notification.type}`}>
            {notification.type === 'success' ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{notification.message}</span>
            <button 
              className="admin-subscription-toast-close"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header */}
        <header className="admin-subscription-header">
          <div className="admin-subscription-header-title">
            <div className="admin-subscription-header-icon">
              <Mail size={24} />
            </div>
            <div>
              <h1>Newsletter Subscribers</h1>
              <p>Manage your newsletter subscriber list</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin-landing')}
            className="admin-subscription-btn admin-subscription-btn-secondary"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
        </header>

        {/* Stats Cards */}
        <div className="admin-subscription-stats">
          <div className="admin-subscription-stat-card">
            <div className="admin-subscription-stat-content">
              <span className="admin-subscription-stat-label">Total Subscribers</span>
              <span className="admin-subscription-stat-value">{stats.total.toLocaleString()}</span>
            </div>
            <div className="admin-subscription-stat-icon admin-subscription-stat-icon-blue">
              <Users size={24} />
            </div>
          </div>
          
          <div className="admin-subscription-stat-card">
            <div className="admin-subscription-stat-content">
              <span className="admin-subscription-stat-label">This Month</span>
              <span className="admin-subscription-stat-value">{stats.thisMonth.toLocaleString()}</span>
            </div>
            <div className="admin-subscription-stat-icon admin-subscription-stat-icon-purple">
              <Calendar size={24} />
            </div>
          </div>
          
          <div className="admin-subscription-stat-card">
            <div className="admin-subscription-stat-content">
              <span className="admin-subscription-stat-label">Growth Rate</span>
              <span className={`admin-subscription-stat-value ${stats.isPositiveGrowth ? 'admin-subscription-positive' : 'admin-subscription-negative'}`}>
                {stats.growthRate}
              </span>
            </div>
            <div className={`admin-subscription-stat-icon ${stats.isPositiveGrowth ? 'admin-subscription-stat-icon-green' : 'admin-subscription-stat-icon-red'}`}>
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="admin-subscription-controls">
          <div className="admin-subscription-controls-left">
            <div className="admin-subscription-search">
              <Search size={18} className="admin-subscription-search-icon" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-subscription-search-input"
                aria-label="Search subscribers"
              />
              {searchTerm && (
                <button 
                  className="admin-subscription-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="admin-subscription-filter">
              <Filter size={18} className="admin-subscription-filter-icon" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="admin-subscription-filter-select"
                aria-label="Filter by date"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
            </div>
          </div>
          
          <div className="admin-subscription-controls-right">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="admin-subscription-btn admin-subscription-btn-secondary"
              aria-label="Refresh data"
            >
              <RefreshCw size={18} className={refreshing ? 'admin-subscription-spin' : ''} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={exportToCSV}
              className="admin-subscription-btn admin-subscription-btn-primary"
              disabled={filtered.length === 0}
              aria-label="Export to CSV"
            >
              <Download size={18} />
              <span>Export CSV</span>
            </button>
            
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="admin-subscription-btn admin-subscription-btn-danger"
                aria-label={`Delete ${selectedIds.length} selected`}
              >
                <Trash2 size={18} />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="admin-subscription-results-info">
          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{subscriptions.length}</strong> subscribers
          </span>
          {selectedIds.length > 0 && (
            <span className="admin-subscription-selected-info">
              • {selectedIds.length} selected
            </span>
          )}
        </div>

        {/* Table Container */}
        <div className="admin-subscription-table-container">
          {filtered.length === 0 ? (
            <div className="admin-subscription-empty">
              <div className="admin-subscription-empty-icon">
                <Mail size={48} />
              </div>
              <h3>No subscribers found</h3>
              <p>
                {searchTerm || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Subscribers will appear here once they sign up.'}
              </p>
              {(searchTerm || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('all');
                  }}
                  className="admin-subscription-btn admin-subscription-btn-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="admin-subscription-table">
                <thead>
                  <tr>
                    <th className="admin-subscription-th-checkbox">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isPartiallySelected;
                        }}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="admin-subscription-checkbox"
                        aria-label="Select all"
                      />
                    </th>
                    <th>Email Address</th>
                    <th>Subscription Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub) => (
                    <tr 
                      key={sub.id} 
                      className={selectedIds.includes(sub.id) ? 'admin-subscription-row-selected' : ''}
                    >
                      <td className="admin-subscription-td-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sub.id)}
                          onChange={(e) => toggleSelectOne(sub.id, e.target.checked)}
                          className="admin-subscription-checkbox"
                          aria-label={`Select ${sub.email}`}
                        />
                      </td>
                      <td className="admin-subscription-td-email">
                        <span className="admin-subscription-email">{sub.email}</span>
                      </td>
                      <td className="admin-subscription-td-date">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="admin-subscription-td-status">
                        <span className="admin-subscription-status admin-subscription-status-active">
                          <CheckCircle size={14} />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="admin-subscription-td-actions">
                        <button
                          onClick={() => {
                            setDeletingId(sub.id);
                            setShowDeleteModal(true);
                          }}
                          disabled={deletingId === sub.id}
                          className="admin-subscription-action-btn admin-subscription-action-btn-delete"
                          aria-label={`Delete ${sub.email}`}
                          title="Delete subscriber"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="admin-subscription-cards">
                {filtered.map((sub) => (
                  <div 
                    key={sub.id} 
                    className={`admin-subscription-card ${selectedIds.includes(sub.id) ? 'admin-subscription-card-selected' : ''}`}
                  >
                    <div className="admin-subscription-card-header">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={(e) => toggleSelectOne(sub.id, e.target.checked)}
                        className="admin-subscription-checkbox"
                        aria-label={`Select ${sub.email}`}
                      />
                      <span className="admin-subscription-status admin-subscription-status-active">
                        <CheckCircle size={12} />
                        <span>Active</span>
                      </span>
                    </div>
                    <div className="admin-subscription-card-body">
                      <div className="admin-subscription-card-email">
                        <Mail size={16} />
                        <span>{sub.email}</span>
                      </div>
                      <div className="admin-subscription-card-date">
                        <Calendar size={14} />
                        <span>{formatDate(sub.created_at)}</span>
                      </div>
                    </div>
                    <div className="admin-subscription-card-footer">
                      <button
                        onClick={() => {
                          setDeletingId(sub.id);
                          setShowDeleteModal(true);
                        }}
                        disabled={deletingId === sub.id}
                        className="admin-subscription-btn admin-subscription-btn-danger admin-subscription-btn-sm"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div 
            className="admin-subscription-modal-overlay"
            onClick={() => setShowDeleteModal(false)}
          >
            <div 
              className="admin-subscription-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div className="admin-subscription-modal-header">
                <div className="admin-subscription-modal-icon">
                  <AlertCircle size={24} />
                </div>
                <h2 id="delete-modal-title">Confirm Deletion</h2>
              </div>
              <div className="admin-subscription-modal-body">
                <p>Are you sure you want to delete this subscriber? This action cannot be undone.</p>
              </div>
              <div className="admin-subscription-modal-footer">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="admin-subscription-btn admin-subscription-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="admin-subscription-btn admin-subscription-btn-danger"
                  disabled={!deletingId}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}