// client/src/hooks/useTickets.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import React, { createContext, useContext } from 'react';
import { useAuth } from './useAuth';

export type TicketStatus = 'open' | 'closed' | 'completed' | 'in_progress' | 'OPEN' | 'COMPLETED';
export type TicketPriority = 'low' | 'medium' | 'high' | string;

export type Ticket = {
  id: string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority?: TicketPriority;
  hotelId?: string | null;
  requesterId?: string | null;
  assigneeId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
};

export type Hotel = {
  id: string;
  name: string;
  is_available?: boolean;
  isAvailable?: boolean;
};

export type DashboardData = {
  summary: {
    total: number;
    open: number;
    completed: number;
    assigned?: number;
    avgPrice?: number;
    totalRevenue?: number;
    minPrice?: number;
    maxPrice?: number;
  };
  statusBreakdown?: Record<string, number>;
  hotels?: Array<{ id: number; name: string; ticketCount?: number; avgPrice?: number }>;
  recentActivity?: Array<{ date: string; created: number; updated: number }>;
  recentTickets?: Array<{
    id: number;
    name: string;
    price: number;
    status: string;
    hotelName?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

const normalizeTicket = (raw: any): Ticket => ({
  id: String(raw.id ?? ''),
  title: raw.title ?? raw.name ?? 'Untitled ticket',
  description: raw.description ?? null,
  status: (raw.status ?? 'open') as TicketStatus,
  priority: (raw.priority ?? raw.ticket_priority ?? 'medium') as TicketPriority,
  hotelId: raw.hotelId ?? raw.hotel_id ?? null,
  requesterId: raw.requesterId ?? raw.requester_id ?? null,
  assigneeId: raw.assigneeId ?? raw.assignee_id ?? null,
  createdAt: raw.createdAt ?? raw.created_at ?? null,
  updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  closedAt: raw.closedAt ?? raw.closed_at ?? null,
});

export const useTickets = (filters = {}) => {
  const isFilters = filters !== false && filters !== null && typeof filters === 'object';

  return useQuery({
    queryKey: ['tickets', isFilters ? filters : 'list'],
    queryFn: async () => {
      if (filters === false) {
        const response = await apiClient.get('/api/hotels');
        if (response && Array.isArray((response as any).hotels)) {
          return {
            hotels: (response as any).hotels,
            total: (response as any).total ?? (response as any).hotels.length,
          };
        }
        if (Array.isArray(response)) {
          return { hotels: response, total: response.length };
        }
        return { hotels: [], total: 0 };
      }

      const params = new URLSearchParams();
      if (isFilters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      const query = params.toString();
      const response = await apiClient.get(`/api/tickets${query ? `?${query}` : ''}`);

      if (response && typeof response === 'object' && 'tickets' in response) {
        const tickets = Array.isArray((response as any).tickets)
          ? (response as any).tickets.map(normalizeTicket)
          : [];
        return { ...response, tickets, total: (response as any).total ?? tickets.length };
      }

      const tickets = Array.isArray(response) ? response.map(normalizeTicket) : [];
      return { tickets, total: tickets.length };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useHotels = () => {
  return useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      const response = await apiClient.get('/api/hotels');
      return response || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; priority?: TicketPriority; [key: string]: unknown }) => {
      const response = await apiClient.post('/api/tickets', data);
      return response;
    },
    onSuccess: () => {
      // Invalidate tickets query to refetch
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/tickets/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useAssignHotelToTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, hotelId }: { ticketId: string; hotelId: string }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/assign-hotel`, { hotelId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
};

export const useTicketDetails = (id?: string | null) => {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${id}`);
      return normalizeTicket(response);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTicketComments = (ticketId?: string | null, page = 1) => {
  return useQuery({
    queryKey: ['ticketComments', ticketId, page],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/comments?page=${page}`);
      return response;
    },
    enabled: !!ticketId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/comments`, { body });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });

  return {
    ...mutation,
    addComment: mutation.mutateAsync,
    isAdding: mutation.isPending,
  };
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      ticketId,
      commentId,
      body,
    }: {
      ticketId: string;
      commentId: number | string;
      body: string;
    }) => {
      const response = await apiClient.put(`/api/tickets/${ticketId}/comments/${commentId}`, { body });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });

  return {
    ...mutation,
    updateComment: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ ticketId, commentId }: { ticketId: string; commentId: number | string }) => {
      await apiClient.delete(`/api/tickets/${ticketId}/comments/${commentId}`);
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });

  return {
    ...mutation,
    deleteComment: mutation.mutateAsync,
    isDeleting: mutation.isPending,
  };
};

export const useTicketActivity = (ticketId) => {
  return useQuery({
    queryKey: ['ticketActivity', ticketId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/activity`);
      return response;
    },
    enabled: !!ticketId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/api/dashboard');
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCurrentUser = () => {
  return useAuth();
};

// React Query context for sharing state
const TicketsContext = createContext(null);

export const TicketsProvider = ({ children }) => {
  const [tickets, setTickets] = React.useState([]);
  const [hotels, setHotels] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Fetch functions
  const refreshTickets = React.useCallback(async () => {
    try {
      const response = await apiClient.get('/api/tickets');
      setTickets(response || []);
    } catch (error) {
      console.error('Failed to refresh tickets:', error);
    }
  }, []);

  const refreshHotels = React.useCallback(async () => {
    try {
      const response = await apiClient.get('/api/hotels');
      setHotels(response || []);
    } catch (error) {
      console.error('Failed to refresh hotels:', error);
    }
  }, []);

  return (
    <TicketsContext.Provider value={{
      tickets,
      hotels,
      refreshTickets,
      refreshHotels,
      currentPage,
      setCurrentPage,
      user: null // This should come from auth context
    }}>
      {children}
    </TicketsContext.Provider>
  );
};

export const useTicketsContext = () => {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTicketsContext must be used within a TicketsProvider');
  }
  return context;
};

export default TicketsProvider;
