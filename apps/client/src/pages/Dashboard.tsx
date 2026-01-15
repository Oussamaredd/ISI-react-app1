// client/src/pages/Dashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useTickets';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  color = '#007bff',
  trend 
}) => (
  <div style={{
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      backgroundColor: color
    }} />
    <div style={{ marginLeft: '0.5rem' }}>
      <h3 style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600', 
        color: '#6c757d', 
        margin: '0 0 0.5rem 0',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#212529',
          lineHeight: 1
        }}>
          {value}
        </span>
        {trend && (
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: trend.isPositive ? '#28a745' : '#dc3545',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6c757d', 
          margin: '0.5rem 0 0 0' 
        }}>
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const RecentTicketsTable: React.FC<{ tickets: any[] }> = ({ tickets }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  }}>
    <h3 style={{ 
      fontSize: '1.125rem', 
      fontWeight: '600', 
      margin: '0 0 1rem 0' 
    }}>
      Recent Activity
    </h3>
    {tickets.length === 0 ? (
      <p style={{ color: '#6c757d', textAlign: 'center', padding: '2rem 0' }}>
        No recent activity
      </p>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e9ecef' }}>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#495057',
                fontSize: '0.875rem'
              }}>
                Ticket
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#495057',
                fontSize: '0.875rem'
              }}>
                Price
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#495057',
                fontSize: '0.875rem'
              }}>
                Status
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#495057',
                fontSize: '0.875rem'
              }}>
                Hotel
              </th>
              <th style={{ 
                padding: '0.75rem', 
                textAlign: 'left', 
                fontWeight: '600',
                color: '#495057',
                fontSize: '0.875rem'
              }}>
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket, index) => (
              <tr 
                key={ticket.id} 
                style={{ 
                  borderBottom: '1px solid #f1f3f4',
                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                }}
              >
                <td style={{ padding: '0.75rem' }}>
                  <Link 
                    to={`/tickets/${ticket.id}/treat`}
                    style={{ 
                      color: '#007bff', 
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    {ticket.name}
                  </Link>
                </td>
                <td style={{ padding: '0.75rem', color: '#495057' }}>
                  ${ticket.price.toFixed(2)}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: ticket.status === 'OPEN' ? '#fff3cd' : '#d4edda',
                    color: ticket.status === 'OPEN' ? '#856404' : '#155724'
                  }}>
                    {ticket.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: '#495057' }}>
                  {ticket.hotelName || '-'}
                </td>
                <td style={{ padding: '0.75rem', color: '#6c757d', fontSize: '0.875rem' }}>
                  {new Date(ticket.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const HotelsBreakdown: React.FC<{ hotels: any[] }> = ({ hotels }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  }}>
    <h3 style={{ 
      fontSize: '1.125rem', 
      fontWeight: '600', 
      margin: '0 0 1rem 0' 
    }}>
      Hotels Performance
    </h3>
    {hotels.length === 0 ? (
      <p style={{ color: '#6c757d', textAlign: 'center', padding: '2rem 0' }}>
        No hotel data available
      </p>
    ) : (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {hotels.map((hotel) => (
          <div 
            key={hotel.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}
          >
            <div>
              <div style={{ 
                fontWeight: '600', 
                color: '#212529',
                marginBottom: '0.25rem'
              }}>
                {hotel.name}
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#6c757d' 
              }}>
                Avg: ${hotel.avgPrice.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#007bff' 
              }}>
                {hotel.ticketCount}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6c757d',
                textTransform: 'uppercase'
              }}>
                Tickets
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ 
          color: '#dc3545', 
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Error loading dashboard: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div>No dashboard data available</div>
      </div>
    );
  }

  const { summary, hotels, recentTickets } = data;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#212529', 
            margin: '0 0 0.5rem 0' 
          }}>
            Dashboard
          </h1>
          <p style={{ 
            color: '#6c757d', 
            margin: 0, 
            fontSize: '1rem' 
          }}>
            Overview of your ticket management system
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <StatCard 
            title="Total Tickets"
            value={summary.total}
            subtitle={`${summary.assigned} assigned to hotels`}
            color="#007bff"
          />
          <StatCard 
            title="Open Tickets"
            value={summary.open}
            subtitle={`${summary.completed} completed`}
            color="#ffc107"
            trend={{
              value: Math.round((summary.open / summary.total) * 100),
              isPositive: false
            }}
          />
          <StatCard 
            title="Completed"
            value={summary.completed}
            subtitle={`${Math.round((summary.completed / summary.total) * 100)}% completion rate`}
            color="#28a745"
            trend={{
              value: Math.round((summary.completed / summary.total) * 100),
              isPositive: true
            }}
          />
          <StatCard 
            title="Total Revenue"
            value={`$${summary.totalRevenue.toFixed(2)}`}
            subtitle={`Avg: $${summary.avgPrice.toFixed(2)}`}
            color="#17a2b8"
          />
        </div>

        {/* Two Column Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <RecentTicketsTable tickets={recentTickets} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <HotelsBreakdown hotels={hotels.slice(0, 5)} />
            
            {/* Quick Actions */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                margin: '0 0 1rem 0' 
              }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/tickets/create"
                  style={{
                    display: 'block',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                >
                  Create New Ticket
                </Link>
                <Link
                  to="/tickets"
                  style={{
                    display: 'block',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: '500',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
                >
                  View All Tickets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}