import React from 'react';
import { useCurrentUser } from '../hooks/useAuth';
import LoginButton from '../components/LoginButton';

export default function LandingPage() {
  const { user, isAuthenticated } = useCurrentUser();

  // If authenticated, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem' }}>Welcome to Ticket Management</h1>
        <p style={{ marginBottom: '2rem' }}>Please log in with your Google account to continue.</p>
        <LoginButton />
      </div>
    </div>
  );
}