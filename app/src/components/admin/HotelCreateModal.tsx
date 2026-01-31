import { useState } from 'react';
import { X, Hotel as HotelIcon } from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { useToast } from '../../context/ToastContext';

export function HotelCreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onCreate({
        name: name.trim(),
        is_available: isAvailable
      });
      
      addToast('New hotel has been created successfully.', 'success');
      
      onClose();
    } catch (error) {
      console.error('Error creating hotel:', error);
      addToast(error.message || 'Failed to create hotel. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isFormValid = name.trim().length > 0 && name.length <= 255;

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
                  Create New Hotel
                </h3>
                <p className="text-sm text-gray-500">
                  Add a new hotel to the system
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
                  This name will be displayed to users when selecting hotels for tickets.
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
                  When unchecked, users won't be able to assign tickets to this hotel.
                </p>
              </div>

              {/* Preview */}
              {(name.trim() || isAvailable !== true) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Name:</strong> {name.trim() || 'Hotel name'}</p>
                    <p><strong>Status:</strong> {isAvailable ? 'Available' : 'Unavailable'}</p>
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
                disabled={!isFormValid || isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Create Hotel</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
