import React from 'react';
import { useAppContext } from '../AppContext';
import { supabase, isGuestUser } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfilePage.css';

const ProfilePage = () => {
  const { user, loading } = useAppContext();
  const isGuest = isGuestUser(user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="profile-page">Loading your profile...</div>;
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <h2>Welcome to Our Store!</h2>
          <p>Please log in or create an account to access your profile and orders.</p>
          <div className="profile-actions">
            <button
              className="profile-btn"
              onClick={() => navigate('/auth')}
            >
              Login / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>My Account</h2>
        <div className="profile-info">
          <div className="profile-item">
            <span className="profile-label">Email:</span>
            <span>{user.email}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">User ID:</span>
            <span>{user.id}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">Member Since:</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {isGuest ? (
          <div className="profile-actions">
            <p className="guest-message">You are currently using a guest account.</p>
            <button
              className="profile-btn"
              onClick={() => navigate('/auth')}
            >
              Register / Login
            </button>
          </div>
        ) : (
          <div className="profile-actions">
            <button
              className="profile-btn logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
