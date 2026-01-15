import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// User Management Hooks
export function useUsers(filters = {}) {
  const { getAuthHeaders } = useAuth();
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users?${params}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUser(userId) {
  const { getAuthHeaders } = useAuth();
  
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, roleIds }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}/roles`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ roleIds }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update user roles');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      addToast({
        type: 'success',
        title: 'Roles Updated',
        message: 'User roles have been updated successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user roles. Please try again.',
      });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isActive }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ is_active: isActive }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', variables.userId] });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `User has been ${variables.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status. Please try again.',
      });
    },
  });
}

// Role Management Hooks
export function useRoles() {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/roles`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }
      
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAvailablePermissions() {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/roles/permissions`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (roleData) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/roles`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(roleData),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      addToast({
        type: 'success',
        title: 'Role Created',
        message: 'New role has been created successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create role. Please try again.',
      });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ roleId, ...roleData }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(roleData),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update role');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role', variables.roleId] });
      addToast({
        type: 'success',
        title: 'Role Updated',
        message: 'Role has been updated successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update role. Please try again.',
      });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (roleId) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/roles/${roleId}`,
        {
          method: 'DELETE',
          headers: await getAuthHeaders(),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      addToast({
        type: 'success',
        title: 'Role Deleted',
        message: 'Role has been deleted successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete role. Please try again.',
      });
    },
  });
}

// Audit Logs Hooks
export function useAuditLogs(filters = {}) {
  const { getAuthHeaders } = useAuth();
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/audit-logs?${params}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAuditStats() {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/audit-logs/stats`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit stats');
      }
      
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// System Settings Hooks
export function useSystemSettings() {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/settings`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (settings) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(settings),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      addToast({
        type: 'success',
        title: 'Settings Updated',
        message: 'System settings have been updated successfully.',
      });
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update system settings. Please try again.',
      });
    },
  });
}

// Helper functions
// Hotel Management Hooks
export function useAdminHotels(filters = {}) {
  const { getAuthHeaders } = useAuth();
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  return useQuery({
    queryKey: ['admin-hotels', filters],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels?${params}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAdminHotel(hotelId) {
  const { getAuthHeaders } = useAuth();
  
  return useQuery({
    queryKey: ['admin-hotel', hotelId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/${hotelId}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotel');
      }
      
      return response.json();
    },
    enabled: !!hotelId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHotelStats() {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-hotel-stats'],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/stats`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotel statistics');
      }
      
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useTopHotels(limit = 10) {
  const { getAuthHeaders } = useAuth();

  return useQuery({
    queryKey: ['admin-top-hotels', limit],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/top?limit=${limit}`,
        { headers: await getAuthHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch top hotels');
      }
      
      return response.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (hotelData) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(hotelData),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create hotel');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hotel-stats'] });
      addToast({
        type: 'success',
        title: 'Hotel Created',
        message: 'New hotel has been created successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create hotel. Please try again.',
      });
    },
  });
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ hotelId, ...hotelData }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/${hotelId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(hotelData),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update hotel');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hotel', variables.hotelId] });
      queryClient.invalidateQueries({ queryKey: ['admin-hotel-stats'] });
      addToast({
        type: 'success',
        title: 'Hotel Updated',
        message: 'Hotel has been updated successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update hotel. Please try again.',
      });
    },
  });
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (hotelId) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/${hotelId}`,
        {
          method: 'DELETE',
          headers: await getAuthHeaders(),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete hotel');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hotel-stats'] });
      addToast({
        type: 'success',
        title: 'Hotel Deleted',
        message: 'Hotel has been deleted successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete hotel. Please try again.',
      });
    },
  });
}

export function useToggleHotelAvailability() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (hotelId) => {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/hotels/${hotelId}/toggle`,
        {
          method: 'PATCH',
          headers: await getAuthHeaders(),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to toggle hotel availability');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-hotels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-hotel-stats'] });
      addToast({
        type: 'success',
        title: 'Hotel Status Updated',
        message: data.message || 'Hotel availability has been updated.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update hotel status. Please try again.',
      });
    },
  });
}

export async function getUsers(filters = {}) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value);
    }
  });

  const response = await fetch(
    `${API_BASE_URL}/api/admin/users?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}