import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    mutationFn: async (data) => {
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
    mutationFn: async (id) => {
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
    mutationFn: async ({ ticketId, hotelId }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/assign-hotel`, { hotel_id: hotelId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'hotels'] });
    },
  });
};

export const useTicketDetails = (id) => {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTicketComments = (ticketId, page = 1) => {
  return useQuery({
    queryKey: ['ticketComments', ticketId, page],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/comments?page=${page}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, content }) => {
      const response = await apiClient.post(`/api/tickets/${ticketId}/comments`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, commentId, content }) => {
      const response = await apiClient.put(`/api/tickets/${ticketId}/comments/${commentId}`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, commentId }) => {
      await apiClient.delete(`/api/tickets/${ticketId}/comments/${commentId}`);
      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketComments'] });
    },
  });
};

export const useTicketActivity = (ticketId) => {
  return useQuery({
    queryKey: ['ticketActivity', ticketId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tickets/${ticketId}/activity`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};