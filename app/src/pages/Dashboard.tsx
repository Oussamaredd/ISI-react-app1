import React from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, isLoading } = useCurrentUser();

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
          <Link to="/app/tickets" className="dashboard-nav-link">
            <span>View Tickets</span>
          </Link>
          <Link to="/app/tickets/create" className="dashboard-nav-link">
            <span>Create Ticket</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
