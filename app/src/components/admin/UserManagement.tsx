import { useMemo, useState } from 'react';
import { Filter, MoreVertical, Search, UserCheck, UserX } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useRoles, useUpdateUserStatus, useUsers } from '../../hooks/adminHooks';
import { useToast } from '../../context/ToastContext';
import { Button } from '../Button';
import { Input } from '../Input';
import { UserCreateModal } from './UserCreateModal';
import { UserEditModal } from './UserEditModal';

type AdminRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: string[];
};

type AdminUser = {
  id: string;
  email: string;
  displayName?: string | null;
  name?: string | null;
  role?: string | null;
  authProvider?: string | null;
  roles?: AdminRole[];
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string | null;
  created_at?: string | null;
  lastLoginAt?: string | null;
  last_login?: string | null;
};

type UsersResponse = {
  users?: AdminUser[];
  total?: number;
  page?: number;
  pageSize?: number;
};

const getDisplayName = (user: AdminUser) => user.displayName ?? user.name ?? user.email;
const getIsActive = (user: AdminUser) => user.isActive ?? user.is_active ?? false;
const getCreatedAt = (user: AdminUser) => user.createdAt ?? user.created_at ?? null;
const getLastLoginAt = (user: AdminUser) => user.lastLoginAt ?? user.last_login ?? null;

const parsePositivePage = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseBooleanParam = (value: string | null) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return '';
};

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(
    () =>
      Boolean(
        searchParams.get('auth_provider') ||
          searchParams.get('created_from') ||
          searchParams.get('created_to'),
      ),
  );

  const search = searchParams.get('search') ?? '';
  const selectedRole = searchParams.get('role') ?? '';
  const selectedStatus = parseBooleanParam(searchParams.get('is_active'));
  const currentPage = parsePositivePage(searchParams.get('page'));
  const selectedProvider = searchParams.get('auth_provider') ?? '';
  const createdFrom = searchParams.get('created_from') ?? '';
  const createdTo = searchParams.get('created_to') ?? '';

  const { addToast } = useToast();
  const { mutate: updateUserStatus, isPending: isUpdatingUserStatus } = useUpdateUserStatus();

  const { data: rawUsersData, isLoading, error } = useUsers({
    search,
    role: selectedRole,
    is_active: selectedStatus,
    auth_provider: selectedProvider,
    created_from: createdFrom,
    created_to: createdTo,
    page: currentPage,
    limit: 20,
  });
  const usersData = (rawUsersData ?? {}) as UsersResponse;

  const { data: rawRolesData } = useRoles();
  const rolesData = Array.isArray(rawRolesData) ? (rawRolesData as AdminRole[]) : [];

  const users = Array.isArray(usersData.users) ? usersData.users : [];
  const total = usersData.total ?? 0;
  const pageSize = usersData.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const visiblePages = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const setQueryParam = (key: string, value: string, resetPage = true) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }

      if (resetPage) {
        next.delete('page');
      }

      return next;
    });
  };

  const handleStatusToggle = (user: AdminUser) => {
    updateUserStatus(
      {
        userId: user.id,
        isActive: !getIsActive(user),
      },
      {
        onError: () => {
          addToast('Failed to update user status. Please try again.', 'error');
        },
      },
    );
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) {
      return;
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('page', String(newPage));
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('search');
      next.delete('role');
      next.delete('is_active');
      next.delete('auth_provider');
      next.delete('created_from');
      next.delete('created_to');
      next.delete('page');
      return next;
    });
  };

  const getStatusBadge = (isActive: boolean) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getRoleBadge = (roles: AdminRole[] | undefined, fallbackRole?: string | null) => {
    if (!Array.isArray(roles) || roles.length === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {fallbackRole ?? 'user'}
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role) => (
          <span
            key={role.id}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {role.name}
          </span>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600">
          <p>Error loading users: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(event) => setQueryParam('search', event.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(event) => setQueryParam('role', event.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Roles</option>
            {rolesData.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus === '' ? '' : String(selectedStatus)}
            onChange={(event) => setQueryParam('is_active', event.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Any Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>

          <Button
            variant="secondary"
            className="flex items-center justify-center space-x-2"
            onClick={() => setShowMoreFilters((previous) => !previous)}
          >
            <Filter className="w-4 h-4" />
            <span>{showMoreFilters ? 'Hide Filters' : 'More Filters'}</span>
          </Button>
        </div>

        {showMoreFilters ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-200 mt-4 pt-4">
            <select
              value={selectedProvider}
              onChange={(event) => setQueryParam('auth_provider', event.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Any Provider</option>
              <option value="local">Local</option>
              <option value="google">Google</option>
            </select>

            <Input
              type="date"
              value={createdFrom}
              onChange={(event) => setQueryParam('created_from', event.target.value)}
              placeholder="Created from"
            />

            <Input
              type="date"
              value={createdTo}
              onChange={(event) => setQueryParam('created_to', event.target.value)}
              placeholder="Created to"
            />

            <Button variant="secondary" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {getDisplayName(user).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{getDisplayName(user)}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.roles, user.role)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(getIsActive(user))}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getLastLoginAt(user) ? new Date(getLastLoginAt(user) as string).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCreatedAt(user) ? new Date(getCreatedAt(user) as string).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleStatusToggle(user)}
                            className={
                              getIsActive(user)
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }
                            title={getIsActive(user) ? 'Deactivate User' : 'Activate User'}
                            disabled={isUpdatingUserStatus}
                          >
                            {getIsActive(user) ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of{' '}
                      <span className="font-medium">{total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        Previous
                      </Button>

                      {visiblePages.map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {showCreateModal ? <UserCreateModal onClose={() => setShowCreateModal(false)} roles={rolesData} /> : null}

      {showEditModal ? <UserEditModal user={editingUser} onClose={handleCloseModal} roles={rolesData} /> : null}
    </div>
  );
}
