import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
export type Ticket = {
  id: number;
  name: string;
  price: number;
  status: 'OPEN' | 'COMPLETED';
  hotelId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Hotel = {
  id: number;
  name: string;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateTicketData = Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>;

// Custom hooks using our API client
import { apiClient } from './api';

export const useTickets = () => {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await apiClient.get('/api/tickets');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useHotels = () => {
  return useQuery({
    queryKey: ['hotels'],
    queryFn: async () => {
      const response = await apiClient.get('/api/hotels');
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      const response = await apiClient.post('/api/tickets', data);
      return response.data;
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
    mutationFn: async (id: number) => {
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
    mutationFn: async ({ ticketId, hotelId }: { ticketId: number; hotelId: number }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/assign-hotel`, { hotel_id: hotelId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'hotels'] });
    },
  });
};