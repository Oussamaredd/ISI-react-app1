import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import { Input } from '../Input';
import { useTickets, type Ticket } from '../../hooks/useTickets';

type TicketsResponse = {
  tickets?: Ticket[];
  total?: number;
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

const toDisplayStatus = (status: Ticket['status']) => {
  const normalized = (status ?? 'open').toString().toLowerCase();

  if (normalized === 'in_progress') {
    return 'In Progress';
  }

  if (normalized === 'completed') {
    return 'Completed';
  }

  if (normalized === 'closed') {
    return 'Closed';
  }

  return 'Open';
};

const getStatusBadgeClassName = (status: Ticket['status']) => {
  const normalized = (status ?? 'open').toString().toLowerCase();

  if (normalized === 'completed') {
    return 'ops-chip ops-chip-success';
  }

  if (normalized === 'in_progress') {
    return 'ops-chip ops-chip-warning';
  }

  if (normalized === 'closed') {
    return 'ops-chip ops-chip-info';
  }

  return 'ops-chip ops-chip-info';
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const toDisplaySupportCategory = (supportCategory?: string | null) => {
  if (!supportCategory) {
    return 'general_help';
  }

  return supportCategory;
};

export function AdminTicketManagement() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = {
    q: search || undefined,
    status: status || undefined,
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  };

  const {
    data: rawTickets,
    isLoading,
    error,
    refetch,
  } = useTickets(filters);

  const ticketsData = (rawTickets ?? {}) as TicketsResponse;

  const tickets = Array.isArray(ticketsData.tickets) ? ticketsData.tickets : [];
  const total = ticketsData.total ?? tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 ops-admin-panel">
      <h2 className="text-xl font-semibold text-gray-900">Ticket Management</h2>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              aria-label="Search tickets"
              placeholder="Search tickets by title"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="w-full pl-10"
            />
          </div>

          <select
            aria-label="Filter tickets by status"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" aria-hidden="true"></div>
            <p className="mt-2 text-gray-500">Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="p-6" role="alert" aria-live="assertive">
            <p className="text-red-600">Error loading tickets: {(error as Error).message}</p>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="mt-3 ops-btn ops-btn-primary"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center" role="status" aria-live="polite">
            <p className="text-gray-600 font-medium">No tickets match the current filters.</p>
            <p className="text-sm text-gray-500 mt-1">Try a different search term or status.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title / Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Support Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated At
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ticket.title || 'Untitled ticket'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={getStatusBadgeClassName(ticket.status)}
                        >
                          {toDisplayStatus(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {toDisplaySupportCategory(ticket.supportCategory)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(ticket.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/app/tickets/${ticket.id}/details`}
                            className="ops-admin-inline-link"
                          >
                            View details
                          </Link>
                          <Link
                            to={`/app/tickets/${ticket.id}/treat`}
                            className="ops-admin-inline-link"
                          >
                            Treat
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="ops-btn ops-btn-outline"
              >
                Previous
              </button>
              <p className="text-sm text-gray-600" aria-live="polite">
                Page {currentPage} of {totalPages}
              </p>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="ops-btn ops-btn-outline"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
