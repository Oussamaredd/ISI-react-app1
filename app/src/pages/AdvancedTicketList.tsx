// client/src/pages/AdvancedTicketList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTickets, Ticket } from '../hooks/useTickets';

interface Filters {
  status: string;
  hotel_id: string;
  assignee_id: string;
  q: string;
  page: number;
  pageSize: number;
  total?: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'COMPLETED', label: 'Completed' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_PLACEHOLDER = 'Search by ticket name...';

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TicketRow: React.FC<{ ticket: Ticket; hotelName?: string }> = ({ ticket, hotelName }) => {
  const status = (ticket.status || 'open').toString().toUpperCase();
  const priority = (ticket.priority || 'medium').toString().toUpperCase();
  const statusBg = status === 'OPEN' ? '#fff3cd' : '#d4edda';
  const statusColor = status === 'OPEN' ? '#856404' : '#155724';
  const priorityColor =
    priority === 'HIGH' ? '#dc3545' : priority === 'LOW' ? '#6c757d' : '#0d6efd';

  return (
    <tr style={{
      borderBottom: '1px solid #f1f3f4',
      backgroundColor: 'white'
    }}>
      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
        <Link
          to={`/tickets/${ticket.id}/treat`}
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '0.95rem'
          }}
        >
          {ticket.title}
        </Link>
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle', color: priorityColor, fontWeight: 600 }}>
        {priority}
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '500',
          backgroundColor: statusBg,
          color: statusColor
        }}>
          {status}
        </span>
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle', color: '#495057' }}>
        {hotelName || ticket.hotelId || (
          <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Unassigned</span>
        )}
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            to={`/tickets/${ticket.id}/treat`}
            aria-label={`Treat ${ticket.title}`}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Treat Ticket
          </Link>
        </div>
      </td>
    </tr>
  );
};

const SearchAndFilters: React.FC<{
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  hotels: any[];
}> = ({ filters, onFiltersChange, hotels }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ q: filters.q, page: 1 }); // Reset to first page on search
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ [key]: value, page: 1 }); // Reset to first page on filter change
  };

  const clearFilters = () => {
    onFiltersChange({
      status: '',
      hotel_id: '',
      assignee_id: '',
      q: SEARCH_PLACEHOLDER,
      page: 1,
    });
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef',
      marginBottom: '1.5rem'
    }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="search" style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Search Tickets
            </label>
            <input
              id="search"
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              onFocus={() => {
                if (filters.q === SEARCH_PLACEHOLDER) {
                  onFiltersChange({ q: '' });
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: '#f8f9fa'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              alignSelf: 'flex-end',
              height: 'fit-content'
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Toggle Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#007bff',
            fontWeight: '500'
          }}
        >
          <span>{isExpanded ? 'Hide' : 'Show'} Filters</span>
          <span style={{ fontSize: '0.8rem' }}>
            {isExpanded ? '\u25b2' : '\u25bc'}
          </span>
        </button>

        <button
          onClick={clearFilters}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Status Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hotel Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Hotel
              </label>
              <select
                value={filters.hotel_id}
                onChange={(e) => handleFilterChange('hotel_id', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">All Hotels</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id.toString()}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size Filter */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Results per page
              </label>
              <select
                value={filters.pageSize.toString()}
                onChange={(e) => handleFilterChange('pageSize', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size.toString()}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
            {filters.total} tickets found
          </div>
        </div>
      )}
    </div>
  );
};

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, pageSize, total, onPageChange }) => {
  const getVisiblePages = () => {
    const delta = 2; // Show 2 pages before and after current
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
        Showing {startItem}-{endItem} of {total} tickets
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === 1 ? '#f8f9fa' : '#007bff',
            color: currentPage === 1 ? '#6c757d' : 'white',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Previous
        </button>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {getVisiblePages().map((page, index) => (
            <button
              key={index}
              onClick={() => page !== '...' && onPageChange(page as number)}
              disabled={page === '...'}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: page === currentPage ? '#007bff' : 'white',
                color: page === currentPage ? 'white' : '#495057',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                cursor: page === '...' ? 'default' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: page === currentPage ? 'bold' : 'normal'
              }}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#007bff',
            color: currentPage === totalPages ? '#6c757d' : 'white',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Add loading spinner styles to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (document.head) {
    document.head.appendChild(style);
  }
}

export default function AdvancedTicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<Filters>({
    status: searchParams.get('status') || '',
    hotel_id: searchParams.get('hotel_id') || '',
    assignee_id: searchParams.get('assignee_id') || '',
    q: searchParams.get('q') || SEARCH_PLACEHOLDER,
    page: parsePositiveNumber(searchParams.get('page'), 1),
    pageSize: parsePositiveNumber(searchParams.get('pageSize'), 20),
  });
  const normalizedQuery = filters.q === SEARCH_PLACEHOLDER ? '' : filters.q;

  // Prepare filters for API call
  const apiFilters = {
    status: filters.status || undefined,
    hotel_id: filters.hotel_id || undefined,
    assignee_id: filters.assignee_id || undefined,
    q: normalizedQuery || undefined,
    limit: filters.pageSize,
    offset: (filters.page - 1) * filters.pageSize,
  };

  const ticketsResult = useTickets(apiFilters);
  const hotelsResult = useTickets(false);

  const isLoading = ticketsResult?.isLoading ?? false;
  const error = ticketsResult?.error ?? null;

  const ticketsData = (ticketsResult?.data ?? {}) as any;
  const tickets = Array.isArray(ticketsData.tickets) ? ticketsData.tickets : [];
  const total = Number.isFinite(ticketsData.total) ? ticketsData.total : tickets.length;

  const hotelsData = (hotelsResult?.data ?? {}) as any;
  const hotels = Array.isArray(hotelsData.hotels) ? hotelsData.hotels : [];
  const hotelLookup = useMemo(() => {
    return hotels.reduce((acc: Record<string, string>, hotel: any) => {
      const id = String(hotel.id ?? hotel.hotel_id ?? '');
      if (id) {
        acc[id] = hotel.name ?? hotel.hotel_name ?? '';
      }
      return acc;
    }, {});
  }, [hotels]);

  // Update URL when filters change
  useEffect(() => {
    if (error) {
      return;
    }
    const params = new URLSearchParams();
    const filtersForUrl = { ...filters, q: normalizedQuery };
    
    Object.entries(filtersForUrl).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'total') {
        params.set(key, value.toString());
      }
    });

    const nextSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (currentSearch !== nextSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [error, filters, normalizedQuery, searchParams, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => {
      const merged = { ...prev, ...newFilters };
      return {
        ...merged,
        page: parsePositiveNumber(String(merged.page), 1),
        pageSize: parsePositiveNumber(String(merged.pageSize), 20),
      };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page: parsePositiveNumber(String(page), 1) }));
  };

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
          Error loading tickets: {error.message}
        </div>
        <button
          onClick={() => window.location.reload()}
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
            Advanced Tickets
          </h1>
          <p style={{ 
            color: '#6c757d', 
            margin: 0, 
            fontSize: '1rem' 
          }}>
            Search, filter, and manage your tickets
          </p>
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          filters={{ ...filters, total }}
          onFiltersChange={handleFiltersChange}
          hotels={hotels}
        />

        {/* Loading State */}
        {isLoading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }} role="img" aria-label="Loading" />
              <div>Loading tickets...</div>
            </div>
          </div>
        )}

        {/* Tickets Table */}
        {!isLoading && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e9ecef',
            overflow: 'hidden'
          }}>
            {tickets.length === 0 ? (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">🎫</div>
                <div style={{ fontSize: '0.1rem', height: 0, overflow: 'hidden' }} aria-hidden="true">ðŸŽ«</div>
                <div style={{ fontSize: '0.1rem', height: 0, overflow: 'hidden' }} aria-hidden="true">Ã°Å¸Å½Â«</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  No tickets found
                </div>
                <div>
                  {filters.q || filters.status || filters.hotel_id ? (
                    <span>Try adjusting your filters or <button
                      onClick={() => handleFiltersChange({
                        status: '',
                        hotel_id: '',
                        q: '',
                        page: 1,
                      })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007bff',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                    >
                      clear all filters
                    </button></span>
                  ) : (
                    <button
                      onClick={() => navigate('/tickets/create')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007bff',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                    >
                      create your first ticket
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        color: '#495057',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap'
                      }}>
                        Ticket Name
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        color: '#495057',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap'
                      }}>
                        Priority
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}>
                        Ticket Status
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}>
                        Hotel Name
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap'
                    }}>
                        Treat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        hotelName={ticket.hotelId ? hotelLookup[String(ticket.hotelId)] : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && tickets.length > 0 && (
          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
