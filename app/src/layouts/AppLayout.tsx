import React from "react";
import {
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Trophy,
  Truck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import LogoutButton from "../components/LogoutButton";
import BrandLogo from "../components/branding/BrandLogo";
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
} from "../utils/authz";

type AppNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  utility?: boolean;
  requiresAdmin?: boolean;
  requiresAgent?: boolean;
  requiresCitizen?: boolean;
  requiresManager?: boolean;
  matches: (pathname: string) => boolean;
};

type PageMeta = {
  label: string;
  requiresAdmin?: boolean;
  requiresAgent?: boolean;
  requiresCitizen?: boolean;
  requiresManager?: boolean;
  matches: (pathname: string) => boolean;
};

const DESKTOP_MEDIA_QUERY = "(min-width: 721px)";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "ecotrack.sidebar.collapsed";
const SIDEBAR_ID = "app-sidebar-navigation";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const isTicketLifecycleRoute = (pathname: string) =>
  /^\/app\/tickets\/[^/]+\/(details|treat)$/.test(pathname);

const isSupportWorkspaceRoute = (pathname: string) =>
  pathname === "/app/support" ||
  pathname === "/app/tickets" ||
  isRouteActive(pathname, "/app/tickets/advanced") ||
  isRouteActive(pathname, "/app/tickets/create") ||
  isTicketLifecycleRoute(pathname);

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

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0
  );

export default function AppLayout() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const sidebarRef = React.useRef<HTMLElement | null>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const wasMobileSidebarOpenRef = React.useRef(false);
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const canAccessAdmin = hasAdminAccess(user);
  const canAccessAgent = hasAgentAccess(user);
  const canAccessCitizen = hasCitizenAccess(user);
  const canAccessManager = hasManagerAccess(user);
  const displayName = user?.displayName || user?.name || user?.email || "User";
  const profileImageUrl = getUserAvatarUrl(user);
  const [hasAvatarError, setHasAvatarError] = React.useState(false);
  const [isCollapsedToggleHovered, setIsCollapsedToggleHovered] = React.useState(false);
  const isSidebarCompact = isDesktop && isSidebarCollapsed;
  const shellClassName = [
    "app-shell",
    isSidebarCompact ? "app-shell-collapsed" : "",
    !isDesktop && isMobileSidebarOpen ? "app-shell-mobile-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");
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

  React.useEffect(() => {
    if (isDesktop) {
      setIsMobileSidebarOpen(false);
    }
  }, [isDesktop]);

  React.useEffect(() => {
    if (!isSidebarCompact) {
      setIsCollapsedToggleHovered(false);
    }
  }, [isSidebarCompact]);

  React.useEffect(() => {
    if (!isDesktop) {
      setIsMobileSidebarOpen(false);
    }
  }, [location.pathname, isDesktop]);

  const closeMobileSidebar = React.useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  React.useEffect(() => {
    if (isDesktop || !isMobileSidebarOpen || typeof document === "undefined") {
      return;
    }

    const sidebarElement = sidebarRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = sidebarElement
      ? getFocusableElements(sidebarElement)
      : [];
    const firstFocusable = focusableElements[0] ?? sidebarElement;
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!sidebarElement) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSidebar();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const scopedFocusableElements = getFocusableElements(sidebarElement);
      if (scopedFocusableElements.length === 0) {
        event.preventDefault();
        sidebarElement.focus();
        return;
      }

      const first = scopedFocusableElements[0];
      const last = scopedFocusableElements[scopedFocusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      const isActiveInsideSidebar = Boolean(
        activeElement && sidebarElement.contains(activeElement)
      );

      if (event.shiftKey) {
        if (!isActiveInsideSidebar || activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!isActiveInsideSidebar || activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileSidebar, isDesktop, isMobileSidebarOpen]);

  React.useEffect(() => {
    if (isDesktop) {
      wasMobileSidebarOpenRef.current = false;
      return;
    }

    if (wasMobileSidebarOpenRef.current && !isMobileSidebarOpen) {
      toggleButtonRef.current?.focus();
    }

    wasMobileSidebarOpenRef.current = isMobileSidebarOpen;
  }, [isDesktop, isMobileSidebarOpen]);

  const navItems = React.useMemo<AppNavItem[]>(
    () => [
      {
        to: "/app/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        matches: (pathname) => pathname === "/app/dashboard",
      },
      {
        to: '/app/agent/tour',
        label: 'Agent Tour',
        icon: Truck,
        requiresAgent: true,
        matches: (pathname) => isRouteActive(pathname, '/app/agent/tour'),
      },
      {
        to: '/app/manager/planning',
        label: 'Tour Planning',
        icon: MapPin,
        requiresManager: true,
        matches: (pathname) => isRouteActive(pathname, '/app/manager/planning'),
      },
      {
        to: '/app/manager/reports',
        label: 'Manager Reports',
        icon: FileText,
        requiresManager: true,
        matches: (pathname) => isRouteActive(pathname, '/app/manager/reports'),
      },
      {
        to: '/app/citizen/report',
        label: 'Report Overflow',
        icon: MapPin,
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/report'),
      },
      {
        to: '/app/citizen/profile',
        label: 'Citizen Profile',
        icon: User,
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/profile'),
      },
      {
        to: '/app/citizen/challenges',
        label: 'Challenges',
        icon: Trophy,
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/challenges'),
      },
      {
        to: "/app/settings",
        label: "Settings",
        icon: Settings,
        utility: true,
        matches: (pathname) => isRouteActive(pathname, "/app/settings"),
      },
      {
        to: "/app/support",
        label: "Support",
        icon: LifeBuoy,
        utility: true,
        matches: (pathname) => isSupportWorkspaceRoute(pathname),
      },
      {
        to: "/app/admin",
        label: "Admin Center",
        icon: Shield,
        utility: true,
        requiresAdmin: true,
        matches: (pathname) => isRouteActive(pathname, "/app/admin"),
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
        label: "Support Workspace",
        matches: (pathname) => pathname === "/app/support",
      },
      {
        label: "Ticket Details",
        matches: (pathname) => /^\/app\/tickets\/[^/]+\/details$/.test(pathname),
      },
      {
        label: "Treat Ticket",
        matches: (pathname) => /^\/app\/tickets\/[^/]+\/treat$/.test(pathname),
      },
      {
        label: 'Agent Tour',
        requiresAgent: true,
        matches: (pathname) => isRouteActive(pathname, '/app/agent/tour'),
      },
      {
        label: 'Tour Planning',
        requiresManager: true,
        matches: (pathname) => isRouteActive(pathname, '/app/manager/planning'),
      },
      {
        label: 'Manager Reports',
        requiresManager: true,
        matches: (pathname) => isRouteActive(pathname, '/app/manager/reports'),
      },
      {
        label: 'Report Overflow',
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/report'),
      },
      {
        label: 'Citizen Profile',
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/profile'),
      },
      {
        label: 'Challenges',
        requiresCitizen: true,
        matches: (pathname) => isRouteActive(pathname, '/app/citizen/challenges'),
      },
      {
        label: "Settings",
        matches: (pathname) => isRouteActive(pathname, "/app/settings"),
      },
      {
        label: "Admin Center",
        requiresAdmin: true,
        matches: (pathname) => isRouteActive(pathname, "/app/admin"),
      },
    ],
    []
  );

  const visibleNavItems = navItems.filter(
    (item) =>
      (!item.requiresAdmin || canAccessAdmin) &&
      (!item.requiresAgent || canAccessAgent) &&
      (!item.requiresCitizen || canAccessCitizen) &&
      (!item.requiresManager || canAccessManager)
  );
  const primaryLinks = visibleNavItems.filter((item) => !item.utility);
  const utilityLinks = visibleNavItems.filter((item) => item.utility);

  const currentPage =
    currentPageCatalog
      .filter((page) => !page.requiresAdmin || canAccessAdmin)
      .filter((page) => !page.requiresAgent || canAccessAgent)
      .filter((page) => !page.requiresCitizen || canAccessCitizen)
      .filter((page) => !page.requiresManager || canAccessManager)
      .find((page) => page.matches(location.pathname)) ?? {
      label: "Workspace",
      matches: () => true,
    };
  const isSidebarExpanded = isDesktop ? !isSidebarCompact : isMobileSidebarOpen;
  const SidebarToggleIcon = isSidebarExpanded
    ? PanelLeftClose
    : PanelLeftOpen;
  const sidebarToggleLabel = isSidebarExpanded
    ? "Close sidebar"
    : "Open sidebar";
  const isMobileSidebarHidden = !isDesktop && !isMobileSidebarOpen;
  const sidebarTopClassName = [
    "app-sidebar-top",
    isSidebarCompact && isCollapsedToggleHovered
      ? "app-sidebar-top-toggle-hovered"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const brandLinkClassName = [
    "app-brand-link",
    isSidebarCompact && isCollapsedToggleHovered ? "app-brand-link-faded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleSidebarToggle = () => {
    if (isDesktop) {
      setIsSidebarCollapsed((current) => !current);
      return;
    }
    setIsMobileSidebarOpen((current) => !current);
  };

  const closeSidebarAfterNavigation = () => {
    if (!isDesktop) {
      closeMobileSidebar();
    }
  };

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

  const renderNavLink = (item: AppNavItem) => {
    const Icon = item.icon;
    const isActive = item.matches(location.pathname);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={buildLinkClass(isActive, Boolean(item.utility))}
        onClick={closeSidebarAfterNavigation}
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
      <aside
        id={SIDEBAR_ID}
        ref={sidebarRef}
        className="app-sidebar"
        aria-label="Sidebar navigation"
        aria-hidden={isMobileSidebarHidden}
        tabIndex={-1}
      >
        <div className={sidebarTopClassName}>
          <Link to="/app/dashboard" className={brandLinkClassName} aria-label="EcoTrack dashboard">
            <BrandLogo imageClassName="app-brand-logo" textClassName="app-brand-wordmark" />
          </Link>
          <button
            type="button"
            className="app-sidebar-toggle app-sidebar-toggle-inline"
            onClick={handleSidebarToggle}
            onMouseEnter={() => setIsCollapsedToggleHovered(true)}
            onMouseLeave={() => setIsCollapsedToggleHovered(false)}
            aria-label={sidebarToggleLabel}
            aria-expanded={isSidebarExpanded}
            aria-controls={SIDEBAR_ID}
          >
            <SidebarToggleIcon size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="app-sidebar-nav" aria-label="Product navigation">
          {primaryLinks.map((link) => renderNavLink(link))}
        </nav>

        <div className="app-sidebar-bottom">
          {utilityLinks.map((link) => renderNavLink(link))}
          <LogoutButton
            className="app-sidebar-logout"
            label="Sign Out"
            compact={isSidebarCompact}
            icon={<LogOut size={16} />}
          />
        </div>
      </aside>
      {!isDesktop && (
        <div
          className="app-sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <main className="app-main">
        <header className="app-main-toolbar" aria-label="Page context">
          <div className="app-main-toolbar-start">
            {!isDesktop && !isMobileSidebarOpen && (
              <button
                ref={toggleButtonRef}
                type="button"
                className="app-sidebar-toggle app-sidebar-toggle-mobile-trigger"
                onClick={handleSidebarToggle}
                aria-label={sidebarToggleLabel}
                aria-expanded={isSidebarExpanded}
                aria-controls={SIDEBAR_ID}
              >
                <SidebarToggleIcon size={18} aria-hidden="true" />
              </button>
            )}
            <div className="app-main-title">
              <span>{currentPage.label}</span>
            </div>
          </div>
          {user && (
            <div className="app-header-account">
              <span className="app-header-account-avatar" aria-hidden="true">
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
              <span className="app-header-account-name">{displayName}</span>
            </div>
          )}
        </header>

        <Outlet />
      </main>
    </div>
  );
}
