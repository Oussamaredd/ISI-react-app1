import { useState } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  FileText, 
  Activity,
  Hotel,
  Ticket,
  LogOut
} from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/adminHooks';
// UserManagement will be implemented later
import { HotelManagement as HotelManagementComponent } from '../components/admin/HotelManagement';
import { SystemSettings as SystemSettingsComponent } from '../components/admin/SystemSettings';
import { AuditLogs } from '../components/admin/AuditLogs';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: usersData, isLoading: usersLoading } = useUsers(
    activeTab === 'overview' || activeTab === 'users' ? {} : null
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'hotels', label: 'Hotel Management', icon: Hotel },
    { id: 'tickets', label: 'Ticket Management', icon: Ticket },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'system', label: 'System Settings', icon: Activity },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection usersData={usersData} usersLoading={usersLoading} />;
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'hotels':
        return <HotelManagement />;
      case 'tickets':
        return <TicketManagement />;
      case 'audit':
        return <AuditLogsSection />;
      case 'system':
        return <SystemSettingsSection />;
      default:
        return <OverviewSection usersData={usersData} usersLoading={usersLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Current User:</span> {user?.email}
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Menu</h2>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({ usersData, usersLoading }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={usersLoading ? '...' : usersData?.total || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Hotels"
          value="12"
          icon={Hotel}
          color="green"
        />
        <StatCard
          title="Open Tickets"
          value="24"
          icon={Ticket}
          color="yellow"
        />
        <StatCard
          title="System Roles"
          value="4"
          icon={Shield}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New user registered</p>
              <p className="text-xs text-gray-500">john.doe@example.com • 2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Role permissions updated</p>
              <p className="text-xs text-gray-500">Manager role • 1 hour ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">System settings changed</p>
              <p className="text-xs text-gray-500">Session timeout updated • 3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
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

function UserManagement() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
      <p>User management functionality will be implemented in the next version.</p>
    </div>
  );
}

function RoleManagement() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Roles & Permissions</h2>
      <p className="text-gray-600">Role management interface will be implemented here...</p>
    </div>
  );
}

function HotelManagement() {
  return <HotelManagementComponent />;
}

function TicketManagement() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ticket Management</h2>
      <p className="text-gray-600">Ticket management interface will be implemented here...</p>
    </div>
  );
}

function AuditLogsSection() {
  return <AuditLogs />;
}

function SystemSettingsSection() {
  return <SystemSettingsComponent />;
}
