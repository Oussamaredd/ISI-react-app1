import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Hotel as HotelIcon,
  Users,
  Ticket,
  TrendingUp
} from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { 
  useAdminHotels, 
  useHotelStats,
  useCreateHotel, 
  useUpdateHotel, 
  useDeleteHotel,
  useToggleHotelAvailability 
} from '../../hooks/adminHooks';
import { 
  HotelCreateModal
} from './HotelCreateModal';
import { 
  HotelEditModal
} from './HotelEditModal';
import { useToast } from '../../context/ToastContext';

export function HotelManagement() {
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { addToast } = useToast();

  const { data: hotelsData, isLoading, error } = useAdminHotels({
    search,
    is_available: availabilityFilter,
    page: currentPage,
    limit: 20
  });

  const { data: statsData } = useHotelStats();
  const { mutateAsync: createHotel } = useCreateHotel();
  const { mutateAsync: updateHotel } = useUpdateHotel();
  const { mutate: deleteHotel } = useDeleteHotel();
  const { mutate: toggleAvailability } = useToggleHotelAvailability();

  const handleCreateHotel = async (hotelData) => {
    await createHotel(hotelData);
  };

  const handleEditHotel = (hotel) => {
    setEditingHotel(hotel);
    setShowEditModal(true);
  };

  const handleUpdateHotel = async (hotelData) => {
    if (!editingHotel) return;
    await updateHotel({ hotelId: editingHotel.id, ...hotelData });
  };

  const handleDeleteHotel = (hotel) => {
    if (window.confirm(`Are you sure you want to delete "${hotel.name}"? This action cannot be undone.`)) {
      deleteHotel(hotel.id);
    }
  };

  const handleToggleAvailability = (hotel) => {
    toggleAvailability(hotel.id);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getStatusBadge = (isAvailable) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isAvailable 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isAvailable ? 'Available' : 'Unavailable'}
      </span>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-red-600">
          <p>Error loading hotels: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Hotel Management</h2>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Hotel
        </Button>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Hotels"
            value={statsData.total_hotels}
            icon={HotelIcon}
            color="blue"
          />
          <StatCard
            title="Active Hotels"
            value={statsData.active_hotels}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Inactive Hotels"
            value={statsData.inactive_hotels}
            icon={ToggleLeft}
            color="yellow"
          />
          <StatCard
            title="With Tickets"
            value={statsData.hotels_with_tickets}
            icon={Ticket}
            color="purple"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search hotels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>

          <Button variant="secondary" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </Button>
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading hotels...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tickets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hotelsData?.data?.hotels?.map((hotel) => (
                    <tr key={hotel.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <HotelIcon className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {hotel.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: #{hotel.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(hotel.is_available)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {hotel.ticket_count || 0} total
                        </div>
                        <div className="text-xs text-gray-500">
                          tickets
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${parseFloat(hotel.avg_price || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          avg price
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(hotel.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditHotel(hotel)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Hotel"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleAvailability(hotel)}
                            className={hotel.is_available ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                            title={hotel.is_available ? 'Deactivate Hotel' : 'Activate Hotel'}
                          >
                            {hotel.is_available ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteHotel(hotel)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Hotel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {hotelsData?.data?.pagination?.totalPages > 1 && (
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
                    disabled={currentPage === hotelsData.data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * 20 + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 20, hotelsData.data.pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{hotelsData.data.pagination.total}</span> results
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
                      
                      {Array.from({ length: hotelsData.data.pagination.totalPages }, (_, i) => i + 1).map((page) => (
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
                        disabled={currentPage === hotelsData.data.pagination.totalPages}
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

      {/* Create Hotel Modal */}
      {showCreateModal && (
        <HotelCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateHotel}
        />
      )}

      {/* Edit Hotel Modal */}
      {showEditModal && (
        <HotelEditModal
          hotel={editingHotel}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateHotel}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
