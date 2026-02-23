import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Ticket, useTickets } from "../hooks/useTickets";
import "../styles/AdvancedTicketList.css";

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
  { value: "", label: "All Status" },
  { value: "OPEN", label: "Open" },
  { value: "COMPLETED", label: "Completed" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_PLACEHOLDER = "Search by ticket name...";

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPriorityClassName = (priority: string) => {
  if (priority === "HIGH") {
    return "advanced-ticket-priority-high";
  }
  if (priority === "LOW") {
    return "advanced-ticket-priority-low";
  }
  return "advanced-ticket-priority-medium";
};

const getStatusClassName = (status: string) => {
  if (status === "OPEN") {
    return "advanced-ticket-status-open";
  }
  return "advanced-ticket-status-completed";
};

const TicketRow: React.FC<{ ticket: Ticket; hotelName?: string }> = ({ ticket, hotelName }) => {
  const status = (ticket.status || "open").toString().toUpperCase();
  const priority = (ticket.priority || "medium").toString().toUpperCase();
  const priorityClassName = getPriorityClassName(priority);
  const statusClassName = getStatusClassName(status);

  return (
    <tr className="advanced-ticket-row">
      <td>
        <Link to={`/app/tickets/${ticket.id}/treat`} className="advanced-ticket-name-link">
          {ticket.title}
        </Link>
      </td>
      <td className={priorityClassName}>{priority}</td>
      <td>
        <span className={`advanced-ticket-status ${statusClassName}`}>{status}</span>
      </td>
      <td className="advanced-ticket-hotel-cell">
        {hotelName || ticket.hotelId || <span className="advanced-ticket-unassigned">Unassigned</span>}
      </td>
      <td>
        <Link
          to={`/app/tickets/${ticket.id}/treat`}
          aria-label={`Treat ${ticket.title}`}
          className="advanced-ticket-treat-link"
        >
          Treat Ticket
        </Link>
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

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onFiltersChange({ q: filters.q, page: 1 });
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ [key]: value, page: 1 });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "",
      hotel_id: "",
      assignee_id: "",
      q: SEARCH_PLACEHOLDER,
      page: 1,
    });
  };

  return (
    <section className="advanced-ticket-card advanced-ticket-filters-card">
      <form onSubmit={handleSearch} className="advanced-ticket-search-form">
        <div className="advanced-ticket-search-controls">
          <div className="advanced-ticket-search-input-wrap">
            <label htmlFor="search" className="advanced-ticket-label">
              Search Tickets
            </label>
            <input
              id="search"
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              value={filters.q}
              onChange={(event) => handleFilterChange("q", event.target.value)}
              onFocus={() => {
                if (filters.q === SEARCH_PLACEHOLDER) {
                  onFiltersChange({ q: "" });
                }
              }}
              className="advanced-ticket-input"
            />
          </div>
          <button type="submit" className="advanced-ticket-primary-btn advanced-ticket-search-btn">
            Search
          </button>
        </div>
      </form>

      <div className="advanced-ticket-filter-actions">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="advanced-ticket-link-btn"
        >
          <span>{isExpanded ? "Hide" : "Show"} Filters</span>
          <span aria-hidden="true">{isExpanded ? "\u25b2" : "\u25bc"}</span>
        </button>

        <button type="button" onClick={clearFilters} className="advanced-ticket-secondary-btn">
          Clear Filters
        </button>
      </div>

      {isExpanded && (
        <div className="advanced-ticket-expanded-filters">
          <div className="advanced-ticket-filters-grid">
            <div className="advanced-ticket-field">
              <label className="advanced-ticket-label">Status</label>
              <select
                value={filters.status}
                onChange={(event) => handleFilterChange("status", event.target.value)}
                className="advanced-ticket-select"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="advanced-ticket-field">
              <label className="advanced-ticket-label">Hotel</label>
              <select
                value={filters.hotel_id}
                onChange={(event) => handleFilterChange("hotel_id", event.target.value)}
                className="advanced-ticket-select"
              >
                <option value="">All Hotels</option>
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id.toString()}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="advanced-ticket-field">
              <label className="advanced-ticket-label">Results per page</label>
              <select
                value={filters.pageSize.toString()}
                onChange={(event) => handleFilterChange("pageSize", event.target.value)}
                className="advanced-ticket-select"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size.toString()}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="advanced-ticket-total">{filters.total} tickets found</p>
        </div>
      )}
    </section>
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
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: Array<number | string> = [];

    for (
      let page = Math.max(2, currentPage - delta);
      page <= Math.min(totalPages - 1, currentPage + delta);
      page += 1
    ) {
      range.push(page);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <section className="advanced-ticket-card advanced-ticket-pagination">
      <p className="advanced-ticket-pagination-summary">
        Showing {startItem}-{endItem} of {total} tickets
      </p>

      <div className="advanced-ticket-pagination-controls">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="advanced-ticket-page-btn"
        >
          Previous
        </button>

        <div className="advanced-ticket-page-number-wrap">
          {getVisiblePages().map((page, index) => (
            <button
              key={`${String(page)}-${index}`}
              type="button"
              onClick={() => page !== "..." && onPageChange(page as number)}
              disabled={page === "..."}
              className={`advanced-ticket-page-btn ${
                page === currentPage ? "advanced-ticket-page-btn-active" : ""
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="advanced-ticket-page-btn"
        >
          Next
        </button>
      </div>
    </section>
  );
};

export default function AdvancedTicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({
    status: searchParams.get("status") || "",
    hotel_id: searchParams.get("hotel_id") || "",
    assignee_id: searchParams.get("assignee_id") || "",
    q: searchParams.get("q") || SEARCH_PLACEHOLDER,
    page: parsePositiveNumber(searchParams.get("page"), 1),
    pageSize: parsePositiveNumber(searchParams.get("pageSize"), 20),
  });
  const normalizedQuery = filters.q === SEARCH_PLACEHOLDER ? "" : filters.q;

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
      const id = String(hotel.id ?? hotel.hotel_id ?? "");
      if (id) {
        acc[id] = hotel.name ?? hotel.hotel_name ?? "";
      }
      return acc;
    }, {});
  }, [hotels]);

  useEffect(() => {
    if (error) {
      return;
    }
    const params = new URLSearchParams();
    const filtersForUrl = { ...filters, q: normalizedQuery };

    Object.entries(filtersForUrl).forEach(([key, value]) => {
      if (value && value !== "" && key !== "total") {
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
  const hasActiveFilters = Boolean(normalizedQuery || filters.status || filters.hotel_id);

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters((current) => {
      const merged = { ...current, ...newFilters };
      return {
        ...merged,
        page: parsePositiveNumber(String(merged.page), 1),
        pageSize: parsePositiveNumber(String(merged.pageSize), 20),
      };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters((current) => ({ ...current, page: parsePositiveNumber(String(page), 1) }));
  };

  if (error) {
    return (
      <section className="advanced-ticket-feedback">
        <p className="advanced-ticket-error-text">Error loading tickets: {error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="advanced-ticket-primary-btn"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="advanced-ticket-page">
      <header className="advanced-ticket-header">
        <h1>Advanced Tickets</h1>
        <p>Search, filter, and manage your tickets</p>
      </header>

      <SearchAndFilters
        filters={{ ...filters, total }}
        onFiltersChange={handleFiltersChange}
        hotels={hotels}
      />

      {isLoading && (
        <section className="advanced-ticket-card advanced-ticket-loading">
          <div className="advanced-ticket-loading-inner">
            <div className="advanced-ticket-spinner" role="img" aria-label="Loading" />
            <div>Loading tickets...</div>
          </div>
        </section>
      )}

      {!isLoading && (
        <section className="advanced-ticket-card advanced-ticket-table-card">
          {tickets.length === 0 ? (
            <div className="advanced-ticket-empty-state">
              <div className="advanced-ticket-empty-icon" aria-hidden="true">
                🎫
              </div>
              <div className="advanced-ticket-empty-title">No tickets found</div>
              <div className="advanced-ticket-empty-copy">
                {hasActiveFilters ? (
                  <span>
                    Try adjusting your filters or{" "}
                    <button
                      type="button"
                      onClick={() =>
                        handleFiltersChange({
                          status: "",
                          hotel_id: "",
                          q: "",
                          page: 1,
                        })
                      }
                      className="advanced-ticket-inline-btn"
                    >
                      clear all filters
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/app/tickets/create")}
                    className="advanced-ticket-inline-btn"
                  >
                    create your first ticket
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="advanced-ticket-table-wrap">
              <table className="advanced-ticket-table">
                <thead>
                  <tr>
                    <th>Ticket Name</th>
                    <th>Priority</th>
                    <th>Ticket Status</th>
                    <th>Hotel Name</th>
                    <th>Treat</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
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
        </section>
      )}

      {!isLoading && tickets.length > 0 && (
        <Pagination
          currentPage={filters.page}
          totalPages={totalPages}
          pageSize={filters.pageSize}
          total={total}
          onPageChange={handlePageChange}
        />
      )}
    </section>
  );
}

