import { useState } from "react";
import { Activity, FileText, LogOut, Settings, Ticket, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/branding/BrandLogo";
import { AuditLogs } from "../components/admin/AuditLogs";
import { AdminTicketManagement } from "../components/admin/AdminTicketManagement";
import { SystemSettings as SystemSettingsComponent } from "../components/admin/SystemSettings";
import { UserManagement } from "../components/admin/UserManagement";
import { useAuth } from "../hooks/useAuth";
import { useUsers } from "../hooks/adminHooks";
import "../styles/OperationsPages.css";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: usersData, isLoading: usersLoading } = useUsers(
    activeTab === "overview" || activeTab === "users" ? {} : null,
  );

  const menuItems = [
    { id: "overview", label: "Overview", icon: Settings },
    { id: "users", label: "User Management", icon: Users },
    { id: "tickets", label: "Ticket Management", icon: Ticket },
    { id: "audit", label: "Audit Logs", icon: FileText },
    { id: "system", label: "System Settings", icon: Activity },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewSection usersData={usersData} usersLoading={usersLoading} />;
      case "users":
        return <UserManagement />;
      case "tickets":
        return <AdminTicketManagement />;
      case "audit":
        return <AuditLogs />;
      case "system":
        return <SystemSettingsComponent />;
      default:
        return <OverviewSection usersData={usersData} usersLoading={usersLoading} />;
    }
  };

  return (
    <section className="ops-admin-shell">
      <header className="ops-hero">
        <BrandLogo
          imageClassName="h-11 w-11"
          textClassName="text-xs font-semibold uppercase tracking-[0.08em] text-slate-200"
        />
        <h1>Admin Center</h1>
        <p>
          Welcome back, {user?.displayName ?? user?.email}. Manage users,
          tickets, and governance settings.
        </p>
        <div className="ops-actions ops-mt-lg">
          <span className="ops-chip ops-chip-info">Current User: {user?.email}</span>
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={handleLogout}
          >
            <LogOut size={14} aria-hidden="true" />
            <span className="ops-inline-gap">Logout</span>
          </button>
        </div>
      </header>

      <div className="ops-admin-layout">
        <aside className="ops-card ops-admin-nav">
          <h2>Admin Menu</h2>
          <nav className="ops-admin-menu" aria-label="Admin navigation">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const className = isActive
                ? "ops-admin-tab ops-admin-tab-active"
                : "ops-admin-tab";
              return (
                <button
                  key={item.id}
                  type="button"
                  className={className}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main>{renderContent()}</main>
      </div>
    </section>
  );
}

function OverviewSection({
  usersData,
  usersLoading,
}: {
  usersData: any;
  usersLoading: boolean;
}) {
  return (
    <section className="ops-page">
      <article className="ops-card">
        <h2>System Overview</h2>
        <div className="ops-grid ops-grid-4 ops-mt-sm">
          <StatCard title="Total Users" value={usersLoading ? "..." : usersData?.total || 0} />
          <StatCard title="Open Tickets" value="-" />
          <StatCard title="Resolved Tickets" value="-" />
          <StatCard title="Audit Events" value="-" />
        </div>
      </article>

      <article className="ops-card">
        <p className="ops-card-intro">
          EcoTrack role mapping is active for citizen, agent, manager, admin,
          and super admin profiles.
        </p>
      </article>

      <article className="ops-card">
        <h2>Recent Activity</h2>
        <ul className="ops-list ops-mt-sm">
          <li className="ops-list-item">
            <p>
              <strong>New user registered</strong>
            </p>
            <p className="ops-list-meta">john.doe@example.com - 2 minutes ago</p>
          </li>
          <li className="ops-list-item">
            <p>
              <strong>User account status changed</strong>
            </p>
            <p className="ops-list-meta">Account activation updated - 1 hour ago</p>
          </li>
          <li className="ops-list-item">
            <p>
              <strong>System settings changed</strong>
            </p>
            <p className="ops-list-meta">Session timeout updated - 3 hours ago</p>
          </li>
        </ul>
      </article>
    </section>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <article className="ops-kpi-card">
      <p className="ops-kpi-label">{title}</p>
      <p className="ops-kpi-value">{value}</p>
    </article>
  );
}
