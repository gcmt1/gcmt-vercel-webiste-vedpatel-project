import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/AdminPage.css';
import { Package, UserPlus, Mail, Settings, LogOut, Menu, X } from 'lucide-react';

export default function AdminLanding() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await checkAdmin())) return;
      setLoading(false);
    })();
  }, []);

  const checkAdmin = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      navigate('/auth');
      return false;
    }

    setUserEmail(session.user.email || '');

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileErr || profile.role !== 'admin') {
      navigate('/');
      return false;
    }

    return true;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-page-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-page-wrapper">
      {/* Header */}
      <header className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-logo">
            <Settings className="admin-page-logo-icon" size={28} />
            <h1 className="admin-page-logo-text">Admin Dashboard</h1>
          </div>
          
          <div className="admin-page-user-section">
            <span className="admin-page-user-email">{userEmail}</span>
            <button 
              onClick={handleLogout}
              className="admin-page-logout-btn"
              aria-label="Logout"
            >
              <LogOut size={20} />
              <span className="admin-page-logout-text">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-page-main">
        <div className="admin-page-container">
          <div className="admin-page-welcome-section">
            <h2 className="admin-page-welcome-title">Welcome to Your Dashboard</h2>
            <p className="admin-page-welcome-subtitle">Manage your e-commerce operations efficiently</p>
          </div>

          {/* Dashboard Cards Grid */}
          <div className="admin-page-cards-grid">
            
            {/* Orders Management Card */}
            <div
              onClick={() => navigate('/admin-order')}
              className="admin-page-card admin-page-card-orders"
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/admin-order')}
            >
              <div className="admin-page-card-icon-wrapper admin-page-icon-green">
                <Package className="admin-page-card-icon" size={40} />
              </div>
              <div className="admin-page-card-content">
                <h3 className="admin-page-card-title">Orders Management</h3>
                <p className="admin-page-card-description">View and manage product orders</p>
              </div>
              <div className="admin-page-card-arrow">→</div>
            </div>

            {/* Newsletter Subscribers Card */}
            <div
              onClick={() => navigate('/admin-subscription')}
              className="admin-page-card admin-page-card-subscribers"
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/admin-subscription')}
            >
              <div className="admin-page-card-icon-wrapper admin-page-icon-blue">
                <UserPlus className="admin-page-card-icon" size={40} />
              </div>
              <div className="admin-page-card-content">
                <h3 className="admin-page-card-title">Newsletter Subscribers</h3>
                <p className="admin-page-card-description">View all email subscriptions</p>
              </div>
              <div className="admin-page-card-arrow">→</div>
            </div>

            {/* Product Management Card */}
            <div
              onClick={() => navigate('/admin-product-manager')}
              className="admin-page-card admin-page-card-products"
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/admin-product-manager')}
            >
              <div className="admin-page-card-icon-wrapper admin-page-icon-orange">
                <Package className="admin-page-card-icon" size={40} />
              </div>
              <div className="admin-page-card-content">
                <h3 className="admin-page-card-title">Product Management</h3>
                <p className="admin-page-card-description">View & manage products</p>
              </div>
              <div className="admin-page-card-arrow">→</div>
            </div>

            {/* Contact Form Card */}
            <div
              onClick={() => navigate('/admin-contactform')}
              className="admin-page-card admin-page-card-contact"
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate('/admin-contactform')}
            >
              <div className="admin-page-card-icon-wrapper admin-page-icon-purple">
                <Mail className="admin-page-card-icon" size={40} />
              </div>
              <div className="admin-page-card-content">
                <h3 className="admin-page-card-title">Contact Form Submissions</h3>
                <p className="admin-page-card-description">See who reached out via contact form</p>
              </div>
              <div className="admin-page-card-arrow">→</div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="admin-page-footer">
        <p className="admin-page-footer-text">
          © {new Date().getFullYear()} Admin Dashboard. All rights reserved.
        </p>
      </footer>
    </div>
  );
}