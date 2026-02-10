import { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon,
  Shield,
  Clock,
  Database,
  Bell,
  Users,
  Lock,
  Globe,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '../Button';
import { Input } from '../Input';
import { useSystemSettings, useUpdateSystemSettings } from '../../hooks/adminHooks';
import { useToast } from '../../context/ToastContext';

export function SystemSettings() {
  const { data: settingsData, isLoading } = useSystemSettings();
  const { mutateAsync: updateSettings, isPending: isUpdating } = useUpdateSystemSettings();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    user_registration: true,
    default_user_role: 'user',
    session_timeout: 24 * 60 * 60 * 1000,
    audit_log_retention: 90,
    max_login_attempts: 5,
    password_min_length: 8,
    email_notifications: true,
    maintenance_mode: false,
    site_name: 'Ticket Management System',
    site_description: 'Professional ticket and hotel management platform',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    currency: 'USD'
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settingsData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync fetched settings into editable form state
      setFormData(settingsData);
    }
  }, [settingsData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateSettings(formData);
      setHasChanges(false);
      
      addToast('System settings have been saved successfully.', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      const defaultSettings = {
        user_registration: true,
        default_user_role: 'user',
        session_timeout: 24 * 60 * 60 * 1000,
        audit_log_retention: 90,
        max_login_attempts: 5,
        password_min_length: 8,
        email_notifications: true,
        maintenance_mode: false,
        site_name: 'Ticket Management System',
        site_description: 'Professional ticket and hotel management platform',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        currency: 'USD'
      };
      
      setFormData(defaultSettings);
      setHasChanges(true);
      
      addToast('Settings have been reset to default values. Save to apply changes.', 'info');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!hasChanges || isUpdating}
            className="flex items-center space-x-2"
          >
            {isUpdating && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
              <p className="text-sm text-gray-600">Basic system configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Name
              </label>
              <Input
                value={formData.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                placeholder="System name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Description
              </label>
              <textarea
                value={formData.site_description}
                onChange={(e) => handleInputChange('site_description', e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Brief description of the system"
              />
            </div>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Authentication Settings</h3>
              <p className="text-sm text-gray-600">Security and access control</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.user_registration}
                  onChange={(e) => handleInputChange('user_registration', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Allow User Registration
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Allow new users to register themselves
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default User Role
              </label>
              <select
                value={formData.default_user_role}
                onChange={(e) => handleInputChange('default_user_role', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (milliseconds)
              </label>
              <Input
                type="number"
                value={formData.session_timeout}
                onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                min="300000"
                step="300000"
              />
              <p className="mt-1 text-xs text-gray-500">
                {(formData.session_timeout / 1000 / 60 / 60).toFixed(1)} hours
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Login Attempts
              </label>
              <Input
                type="number"
                value={formData.max_login_attempts}
                onChange={(e) => handleInputChange('max_login_attempts', parseInt(e.target.value))}
                min="3"
                max="10"
              />
              <p className="mt-1 text-xs text-gray-500">
                Account lockout after failed attempts
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-600">System security policies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Password Length
              </label>
              <Input
                type="number"
                value={formData.password_min_length}
                onChange={(e) => handleInputChange('password_min_length', parseInt(e.target.value))}
                min="6"
                max="20"
              />
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.maintenance_mode}
                  onChange={(e) => handleInputChange('maintenance_mode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Maintenance Mode
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Temporarily disable user access
              </p>
            </div>
          </div>
        </div>

        {/* Data & Retention Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Database className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Data & Retention</h3>
              <p className="text-sm text-gray-600">Data management and cleanup policies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audit Log Retention (days)
              </label>
              <Input
                type="number"
                value={formData.audit_log_retention}
                onChange={(e) => handleInputChange('audit_log_retention', parseInt(e.target.value))}
                min="30"
                max="365"
              />
              <p className="mt-1 text-xs text-gray-500">
                Keep audit logs for this many days
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.email_notifications}
                  onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Email Notifications
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Send system notifications via email
              </p>
            </div>
          </div>
        </div>

        {/* Localization Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Localization</h3>
              <p className="text-sm text-gray-600">Regional and formatting settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={formData.date_format}
                onChange={(e) => handleInputChange('date_format', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
