import React from 'react';
import { useCurrentUser } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1e293b',
      fontFamily: 'Arial, sans-serif',
      padding: '2rem'
    }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name || 'User'}!</p>
      <div style={{ marginTop: '2rem' }}>
        <h2>Navigation</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <a
            href="/tickets"
            style={{ color: '#1e293b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span aria-hidden="true">📋</span>
            <span>View Tickets</span>
          </a>
          <a
            href="/tickets/create"
            style={{ color: '#1e293b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span aria-hidden="true">➕</span>
            <span>Create Ticket</span>
          </a>
        </div>
      </div>
    </div>
  );
}
