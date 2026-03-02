import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import { API_BASE, createApiHeaders, createApiRequestError } from '../services/api';

const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: createApiHeaders(init.headers),
  });

  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return response;
};

// User Management Hooks
export function useUsers(filters = {}) {
  const { isAuthenticated } = useAuth();

  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
  }

  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/users?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated && filters !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}


export function useUser(userId) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/users/${userId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}


export function useUpdateUserRoles() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/users/${userId}/roles`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ roleIds }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user roles');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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
    onError: () => {
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
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: isActive }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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
    onError: () => {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status. Please try again.',
      });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (userData: {
      email: string;
      displayName?: string;
      password: string;
      roleIds: string[];
      isActive: boolean;
    }) => {
      const response = await authFetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      addToast({
        type: 'success',
        title: 'User Created',
        message: 'New user account has been created successfully.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Create Failed',
        message: error.message || 'Failed to create user. Please try again.',
      });
    },
  });
}

// Role Management Hooks
export function useRoles() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/roles`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAvailablePermissions() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/roles/permissions`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}


export function useCreateRole() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (roleData: Record<string, unknown>) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/roles`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roleData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create role');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async ({ roleId, ...roleData }: { roleId: string; [key: string]: unknown }) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/roles/${roleId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roleData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update role');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/roles/${roleId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete role');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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
  const { isAuthenticated } = useAuth();

  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
  }

  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/audit-logs?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated && filters !== null,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAuditStats() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/audit-logs/stats`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit stats');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// System Settings Hooks
export function useSystemSettings() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const response = await authFetch(
        `${API_BASE}/api/admin/settings`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }

      const payload = await response.json();
      return payload.data ?? payload;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const response = await authFetch(
        `${API_BASE}/api/admin/settings`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }

      const payload = await response.json();
      return payload.data ?? payload;
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

export function useDispatchTestNotification() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (payload: {
      severity: 'critical' | 'warning' | 'info';
      message: string;
      channel?: 'email' | 'sms' | 'push';
      recipient?: string;
    }) => {
      const response = await authFetch(`${API_BASE}/api/admin/settings/notifications/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to dispatch test notification');
      }

      const payloadJson = await response.json();
      return payloadJson.data ?? payloadJson;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Notification Dispatched',
        message: 'Test notification has been dispatched and logged.',
      });
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: 'Unable to dispatch test notification.',
      });
    },
  });
}

export async function getUsers(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await authFetch(
    `${API_BASE}/api/admin/users?${params}`,
    {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
      const payload = await response.json();
      return payload.data ?? payload;

}

