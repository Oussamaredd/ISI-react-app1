import { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  User,
  Activity,
  ChevronDown,
  Download,
RefreshCw
} from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { useAuditLogs, useAuditStats } from '../../hooks/adminHooks';
import { useToast } from '../../context/ToastContext';

export function AuditLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const { addToast } = useToast();

  const { data: logsData, isLoading, error } = useAuditLogs({
    search,
    action: actionFilter,
    resource_type: resourceFilter,
    user_id: userFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page: currentPage,
    limit: 50
  });

  const { data: statsData } = useAuditStats();

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleExportLogs = () => {
    addToast('Log export functionality will be implemented in the next version.', 'info');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getActionBadge = (action) => {
    const colorMap = {
      'user_created': 'bg-blue-100 text-blue-800',
      'user_updated': 'bg-yellow-100 text-yellow-800',
      'user_activated': 'bg-green-100 text-green-800',
      'user_deactivated': 'bg-red-100 text-red-800',
      'role_created': 'bg-purple-100 text-purple-800',
      'role_updated': 'bg-indigo-100 text-indigo-800',
      'role_deleted': 'bg-pink-100 text-pink-800',
      'hotel_created': 'bg-cyan-100 text-cyan-800',
      'hotel_updated': 'bg-teal-100 text-teal-800',
      'hotel_deleted': 'bg-orange-100 text-orange-800',
      'hotel_activated': 'bg-lime-100 text-lime-800',
      'hotel_deactivated': 'bg-amber-100 text-amber-800',
      'comment_added': 'bg-emerald-100 text-emerald-800',
      'comment_updated': 'bg-sky-100 text-sky-800',
      'comment_deleted': 'bg-rose-100 text-rose-800',
      'system_settings_updated': 'bg-gray-100 text-gray-800'
    };

    const colorClass = colorMap[action] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const getResourceIcon = (resourceType) => {
    const iconMap = {
      'users': User,
      'roles': Activity,
      'hotels': FileText,
      'tickets': FileText,
      'system': Activity
    };

    const Icon = iconMap[resourceType] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return '-';
    try {
      const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      return Object.keys(parsed).length > 0 ? JSON.stringify(parsed, null, 2) : '-';
    } catch {
      return metadata;
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600">
          <p>Error loading audit logs: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={handleExportLogs}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statsData && statsData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statsData.slice(0, 8).map((stat, index) => (
              <div key={index} className="border-l-4 border-blue-400 pl-4">
                <div className="text-sm font-medium text-gray-900">
                  {stat.action.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500">
                  {stat.resource_type} • {stat.count} actions
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(stat.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Search Bar - Always Visible */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_activated">User Activated</option>
                <option value="user_deactivated">User Deactivated</option>
                <option value="role_created">Role Created</option>
                <option value="role_updated">Role Updated</option>
                <option value="role_deleted">Role Deleted</option>
                <option value="hotel_created">Hotel Created</option>
                <option value="hotel_updated">Hotel Updated</option>
                <option value="hotel_deleted">Hotel Deleted</option>
                <option value="system_settings_updated">System Settings Updated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">All Resources</option>
                <option value="users">Users</option>
                <option value="roles">Roles</option>
                <option value="hotels">Hotels</option>
                <option value="tickets">Tickets</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <Input
                type="number"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filter by user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setActionFilter('');
                  setResourceFilter('');
                  setUserFilter('');
                  setDateFrom('');
                  setDateTo('');
                  setSearch('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading audit logs...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsData?.logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {log.user_name || 'System'}
                            </div>
                            {log.user_id && (
                              <div className="text-xs text-gray-500">
                                ID: {log.user_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getResourceIcon(log.resource_type)}
                          <span className="text-sm text-gray-900 capitalize">
                            {log.resource_type}
                          </span>
                          {log.resource_id && (
                            <span className="text-xs text-gray-500">
                              #{log.resource_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.new_values ? (
                            <details className="cursor-pointer">
                              <summary className="font-medium">View Details</summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-20">
                                {formatMetadata(log.new_values)}
                              </pre>
                            </details>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsData?.totalPages > 1 && (
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
                    disabled={currentPage === logsData.totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * 50 + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 50, logsData.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{logsData.total}</span> results
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
                      
                      {Array.from({ length: logsData.totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
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
                        disabled={currentPage === logsData.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
