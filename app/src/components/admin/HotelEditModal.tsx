import { useEffect, useState } from 'react';
import { X, Hotel as HotelIcon } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { useToast } from '../../context/ToastContext';

interface Hotel {
  name: string;
  is_available: boolean;
  ticket_count?: number;
  avg_price?: string | number;
  created_at: string;
  updated_at: string;
}

export function HotelEditModal({ hotel, onClose, onUpdate }: { hotel: Hotel; onClose: () => void; onUpdate: (data: Partial<Hotel>) => Promise<void> }) {
  const [name, setName] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (hotel) {
      setName(hotel.name || '');
      setIsAvailable(hotel.is_available !== false);
    }
  }, [hotel]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData: Partial<Hotel> = {};
      
      if (name.trim() !== hotel.name) {
        updateData.name = name.trim();
      }
      
      if (isAvailable !== hotel.is_available) {
        updateData.is_available = isAvailable;
      }

      if (Object.keys(updateData).length === 0) {
        addToast('No changes have been made to hotel information.', 'info');
        return;
      }

      await onUpdate(updateData);
      
      addToast('Hotel information has been updated successfully.', 'success');
      
      onClose();
    } catch (error) {
      console.error('Error updating hotel:', error);
      addToast(error.message || 'Failed to update hotel. Please try again.', 'error');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isFormValid = name.trim().length > 0 && name.length <= 255;
  const hasChanges = name.trim() !== hotel.name || isAvailable !== hotel.is_available;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HotelIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Hotel
                </h3>
                <p className="text-sm text-gray-500">
                  Update hotel information
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter hotel name"
                  disabled={isLoading}
                  maxLength={255}
                  className={name.length > 200 ? 'border-red-300' : ''}
                />
                {name.length > 200 && (
                  <p className="mt-1 text-sm text-red-600">
                    Hotel name cannot exceed 255 characters ({name.length}/255)
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Current name: {hotel.name}
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Hotel is available
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Current status: {hotel.is_available ? 'Available' : 'Unavailable'}
                </p>
              </div>

              {/* Hotel Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Hotel Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Tickets:</span>
                    <p className="font-medium text-gray-900">{hotel.ticket_count || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Average Price:</span>
                    <p className="font-medium text-gray-900">
                      ${parseFloat(String(hotel.avg_price || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(hotel.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(hotel.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Preview */}
              {hasChanges && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Changes Preview</h4>
                  <div className="text-sm text-blue-700">
                    {name.trim() !== hotel.name && (
                      <p><strong>Name:</strong> "{hotel.name}" → "{name.trim()}"</p>
                    )}
                    {isAvailable !== hotel.is_available && (
                      <p><strong>Status:</strong> "{hotel.is_available ? 'Available' : 'Unavailable'}" → "{isAvailable ? 'Available' : 'Unavailable'}"</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid || !hasChanges || isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Update Hotel</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
