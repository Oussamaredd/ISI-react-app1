import React from 'react';
import { useCurrentUser } from '../hooks/useAuth';
import LoginButton from '../components/LoginButton';

export default function LandingPage() {
  const { isAuthenticated } = useCurrentUser();

  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  return (
    <div className="landing-page">
      <div className="landing-panel">
        <h1 className="landing-title">Welcome to Ticket Management</h1>
        <p className="landing-subtitle">Please log in with your Google account to continue.</p>
        <LoginButton />
      </div>
    </div>
  );
}
