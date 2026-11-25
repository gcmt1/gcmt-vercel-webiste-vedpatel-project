import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mmiyyhmbxodfdnuqomyx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1taXl5aG1ieG9kZmRudXFvbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNzkwNDksImV4cCI6MjA2MTY1NTA0OX0.KIwuisA_nq1_9ROw88wzMQMa7HQfzPMlrCjCqXdyEDk';

// A local review build must never start a real guest session on mount.
const liveOrigin = ['https://www.gcmtshop.com', 'https://gcmtshop.com'].includes(window.location.origin);
export const supabase = createClient(liveOrigin ? supabaseUrl : window.location.origin, liveOrigin ? supabaseAnonKey : 'local-review-only', {
  auth: {
    autoRefreshToken: true,
    ...(liveOrigin ? {} : { storageKey: 'gcmt-local-session' }),
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Explicitly use localStorage for session persistence
  }
});

// Helper function to get current user (including guest)
export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session?.user || null;
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    return null;
  }
};

// Helper function to check if user is guest
export const isGuestUser = (user) => {
  if (!user || !user.email) return false;
  return user.email.includes('guest_') && user.email.includes('@example.com');
};

// Helper function to clear guest credentials
export const clearGuestCredentials = () => {
  localStorage.removeItem('guest_user_id');
  localStorage.removeItem('guest_user_email');
  localStorage.removeItem('guest_user_password');
};