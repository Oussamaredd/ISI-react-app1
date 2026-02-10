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
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name || 'User'}!</p>

      <div className="dashboard-nav-section">
        <h2>Navigation</h2>
        <div className="dashboard-nav-links">
          <a href="/tickets" className="dashboard-nav-link">
            <span>View Tickets</span>
          </a>
          <a href="/tickets/create" className="dashboard-nav-link">
            <span>Create Ticket</span>
          </a>
        </div>
      </div>
    </div>
  );
}
