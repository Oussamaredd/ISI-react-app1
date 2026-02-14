import React from "react";
import {
  LayoutDashboard,
  ListChecks,
  ListFilter,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PlusSquare,
  Settings,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import LogoutButton from "../components/LogoutButton";
import BrandLogo from "../components/branding/BrandLogo";

type AppNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  utility?: boolean;
  requiresAdmin?: boolean;
  matches: (pathname: string) => boolean;
};

type PageMeta = {
  label: string;
  requiresAdmin?: boolean;
  matches: (pathname: string) => boolean;
};

const DESKTOP_MEDIA_QUERY = "(min-width: 721px)";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "ecotrack.sidebar.collapsed";

const hasAdminRole = (user: any) =>
  user?.roles?.some((role: any) => role.name === "admin" || role.name === "super_admin") ||
  user?.role === "admin" ||
  user?.role === "super_admin";

const isSimpleListRoute = (pathname: string) =>
  pathname === "/app/tickets" || /^\/app\/tickets\/[^/]+\/(details|treat)$/.test(pathname);

const isRouteActive = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const getUserAvatarUrl = (user: unknown): string | null => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const candidateKeys = [
    "avatarUrl",
    "avatar_url",
    "picture",
    "photoUrl",
    "photoURL",
    "imageUrl",
    "imageURL",
  ] as const;

  for (const key of candidateKeys) {
    const value = (user as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
};

export default function AppLayout() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(
    () => {
      if (typeof window === "undefined") {
        return false;
      }
      return (
        window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1"
      );
    }
  );
  const canAccessAdmin = hasAdminRole(user);
  const displayName = user?.displayName || user?.name || user?.email || "User";
  const profileImageUrl = getUserAvatarUrl(user);
  const [hasAvatarError, setHasAvatarError] = React.useState(false);
  const isSidebarCompact = isDesktop && isSidebarCollapsed;
  const shellClassName = isSidebarCompact
    ? "app-shell app-shell-collapsed"
    : "app-shell";
  const hasProfileImage = Boolean(profileImageUrl) && !hasAvatarError;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaQueryChange);
      return () => {
        mediaQuery.removeEventListener("change", handleMediaQueryChange);
      };
    }

    mediaQuery.addListener(handleMediaQueryChange);
    return () => {
      mediaQuery.removeListener(handleMediaQueryChange);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      isSidebarCollapsed ? "1" : "0"
    );
  }, [isSidebarCollapsed]);

  React.useEffect(() => {
    setHasAvatarError(false);
  }, [profileImageUrl]);

  const navItems = React.useMemo<AppNavItem[]>(
    () => [
      {
        to: "/app/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        matches: (pathname) => pathname === "/app/dashboard",
      },
      {
        to: "/app/tickets/advanced",
        label: "Advanced List",
        icon: ListFilter,
        matches: (pathname) => isRouteActive(pathname, "/app/tickets/advanced"),
      },
      {
        to: "/app/tickets",
        label: "Simple List",
        icon: ListChecks,
        matches: (pathname) => isSimpleListRoute(pathname),
      },
      {
        to: "/app/tickets/create",
        label: "Create Ticket",
        icon: PlusSquare,
        matches: (pathname) => isRouteActive(pathname, "/app/tickets/create"),
      },
      {
        to: "/app/admin",
        label: "Admin",
        icon: Shield,
        requiresAdmin: true,
        matches: (pathname) => isRouteActive(pathname, "/app/admin"),
      },
      {
        to: "/app/settings",
        label: "Settings",
        icon: Settings,
        utility: true,
        matches: (pathname) => isRouteActive(pathname, "/app/settings"),
      },
    ],
    []
  );

  const currentPageCatalog = React.useMemo<PageMeta[]>(
    () => [
      {
        label: "Dashboard",
        matches: (pathname) => pathname === "/app/dashboard",
      },
      {
        label: "Advanced List",
        matches: (pathname) => isRouteActive(pathname, "/app/tickets/advanced"),
      },
      {
        label: "Simple List",
        matches: (pathname) => pathname === "/app/tickets",
      },
      {
        label: "Ticket Details",
        matches: (pathname) =>
          /^\/app\/tickets\/[^/]+\/details$/.test(pathname),
      },
      {
        label: "Treat Ticket",
        matches: (pathname) =>
          /^\/app\/tickets\/[^/]+\/treat$/.test(pathname),
      },
      {
        label: "Create Ticket",
        matches: (pathname) => isRouteActive(pathname, "/app/tickets/create"),
      },
      {
        label: "Settings",
        matches: (pathname) => isRouteActive(pathname, "/app/settings"),
      },
      {
        label: "Admin",
        requiresAdmin: true,
        matches: (pathname) => isRouteActive(pathname, "/app/admin"),
      },
    ],
    []
  );

  const visibleNavItems = navItems.filter(
    (item) => !item.requiresAdmin || canAccessAdmin
  );
  const primaryLinks = visibleNavItems.filter((item) => !item.utility);
  const utilityLinks = visibleNavItems.filter((item) => item.utility);

  const currentPage =
    currentPageCatalog
      .filter((page) => !page.requiresAdmin || canAccessAdmin)
      .find((page) => page.matches(location.pathname)) ?? {
      label: "Workspace",
      matches: () => true,
    };
  const SidebarToggleIcon = isSidebarCompact
    ? PanelLeftOpen
    : PanelLeftClose;
  const sidebarToggleLabel = isSidebarCompact
    ? "Expand sidebar"
    : "Collapse sidebar";

  const buildLinkClass = (isActive: boolean, utility = false) => {
    const classes = ["app-sidebar-link"];
    if (utility) {
      classes.push("app-sidebar-link-utility");
    }
    if (isActive) {
      classes.push("app-sidebar-link-active");
    }
    return classes.join(" ");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  const renderNavLink = (item: AppNavItem) => {
    const Icon = item.icon;
    const isActive = item.matches(location.pathname);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={buildLinkClass(isActive, Boolean(item.utility))}
        aria-label={isSidebarCompact ? item.label : undefined}
        title={isSidebarCompact ? item.label : undefined}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="app-sidebar-link-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className={shellClassName}>
      <aside className="app-sidebar" aria-label="Sidebar navigation">
        <div className="app-sidebar-top">
          <Link to="/app/dashboard" className="app-brand-link" aria-label="EcoTrack dashboard">
            <BrandLogo imageClassName="app-brand-logo" textClassName="app-brand-wordmark" />
          </Link>
        </div>

        <nav className="app-sidebar-nav" aria-label="Product navigation">
          {primaryLinks.map((link) => renderNavLink(link))}
        </nav>

        <div className="app-sidebar-bottom">
          {user && (
            <div className="app-sidebar-account">
              <span className="app-sidebar-account-avatar" aria-hidden="true">
                {hasProfileImage ? (
                  <img
                    src={profileImageUrl ?? ""}
                    alt=""
                    onError={() => setHasAvatarError(true)}
                  />
                ) : (
                  <User size={18} />
                )}
              </span>
              <span className="app-sidebar-account-name">{displayName}</span>
            </div>
          )}
          {utilityLinks.map((link) => renderNavLink(link))}
          <LogoutButton
            className="app-sidebar-logout"
            label="Sign Out"
            compact={isSidebarCompact}
            icon={<LogOut size={16} />}
          />
        </div>
      </aside>

      <main className="app-main">
        <header className="app-main-toolbar" aria-label="Page context">
          <button
            type="button"
            className="app-sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarToggleLabel}
            aria-pressed={isSidebarCompact}
          >
            <SidebarToggleIcon size={18} aria-hidden="true" />
          </button>
          <div className="app-main-title">
            <span>{currentPage.label}</span>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
