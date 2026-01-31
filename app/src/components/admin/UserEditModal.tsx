import React, { useState, useEffect } from 'react';
import { X, Shield, User } from 'lucide-react';
import { Button } from '../Button';
import { useUpdateUserRoles } from '../../hooks/adminHooks';
import { useToast } from '../../context/ToastContext';

export function UserEditModal({ user, onClose, roles }) {
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: updateUserRoles } = useUpdateUserRoles();
  const { addToast } = useToast();

  useEffect(() => {
    if (user?.roles) {
      setSelectedRoleIds(user.roles.map(role => role.id));
    }
  }, [user]);

  const handleRoleToggle = (roleId) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateUserRoles({
        userId: user.id,
        roleIds: selectedRoleIds
      });
      
      addToast(`${user.name}'s roles have been updated successfully.`, 'success');
      
      onClose();
    } catch (error) {
      console.error('Error updating user roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!user) return null;

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
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Edit User Roles
                </h3>
                <p className="text-sm text-gray-500">
                  {user.name} • {user.email}
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Assign Roles
                </label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div 
                      key={role.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoleIds.includes(role.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => !role.is_system && handleRoleToggle(role.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        disabled={role.is_system}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {role.display_name}
                          </span>
                          {role.is_system && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {role.description}
                        </p>
                        {role.user_count > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {role.user_count} user{role.user_count !== 1 ? 's' : ''} assigned
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Login:</span>
                    <span className="ml-2 text-gray-900">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Member Since:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">User ID:</span>
                    <span className="ml-2 text-gray-900">#{user.id}</span>
                  </div>
                </div>
              </div>
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
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Update Roles</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}