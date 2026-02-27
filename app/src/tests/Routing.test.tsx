import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi, describe, test, beforeEach, afterEach, expect } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";

const mockUseCurrentUser = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    getAuthHeaders: () => ({}),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockFetch = vi.fn();
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

type AuthMockState = {
  user: Record<string, unknown> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

const setAuthState = (value: AuthMockState) => {
  mockUseCurrentUser.mockReturnValue(value);
};

const renderRoute = (route: string) =>
  renderWithProviders(<App />, {
    route,
    initialEntries: [route],
  });

describe("Routing Matrix", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tickets: [] }),
      text: async () => JSON.stringify({}),
    } as Response);
    vi.stubGlobal("fetch", mockFetch);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("`/` renders landing when unauthenticated", async () => {
    renderRoute("/");

    expect(
      await screen.findByRole(
        "heading",
        { name: /Bridge every ticket handoff/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  test("`/` redirects to `/app/dashboard` when authenticated", async () => {
    setAuthState({
      user: { id: "123", name: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    const { getLocation } = renderRoute("/");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/app/dashboard");
    });
  });

  test("`/login` renders login page when unauthenticated", async () => {
    renderRoute("/login");
    expect(await screen.findByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
  });

  test("`/signup` renders signup page when unauthenticated", async () => {
    renderRoute("/signup");
    expect(await screen.findByRole("heading", { name: /Create your account/i })).toBeInTheDocument();
  });

  test("`/forgot-password` renders forgot-password page when unauthenticated", async () => {
    renderRoute("/forgot-password");
    expect(await screen.findByRole("heading", { name: /Reset your password/i })).toBeInTheDocument();
  });

  test("`/reset-password` renders reset-password page when unauthenticated", async () => {
    renderRoute("/reset-password");
    expect(await screen.findByRole("heading", { name: /Choose a new password/i })).toBeInTheDocument();
  });

  test("`/auth/callback` renders callback status page", async () => {
    renderRoute("/auth/callback?error=Sign-in%20failed");
    expect(await screen.findByRole("heading", { name: /Sign-in failed\./i })).toBeInTheDocument();
  });

  test("guest auth routes redirect to `/app/dashboard` when authenticated", async () => {
    setAuthState({
      user: { id: "123", name: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    for (const route of ["/login", "/signup", "/forgot-password", "/reset-password"]) {
      const { getLocation, unmount } = renderRoute(route);
      await waitFor(() => {
        expect(getLocation()?.pathname).toBe("/app/dashboard");
      });
      unmount();
    }
  }, 20000);

  test("`/app/*` redirects unauthenticated users to `/login`", async () => {
    const { getLocation } = renderRoute("/app/dashboard");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/login");
    });

    expect(getLocation()?.search).toContain("next=");
  });

  test("sidebar toggle works consistently across app routes", async () => {
    setAuthState({
      user: { id: "123", role: "admin", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    const appRoutes = [
      "/app/dashboard",
      "/app/support",
      "/app/settings",
      "/app/admin",
      "/app/agent/tour",
      "/app/manager/planning",
      "/app/manager/reports",
      "/app/citizen/report",
      "/app/citizen/profile",
      "/app/citizen/challenges",
      "/app/tickets/test-1/details",
      "/app/tickets/test-1/treat",
    ];

    for (const route of appRoutes) {
      const { getLocation, unmount } = renderRoute(route);

      await waitFor(() => {
        expect(getLocation()?.pathname).toBe(route);
      });

      const toggleButton = await screen.findByRole("button", { name: /open sidebar/i });
      expect(toggleButton).toHaveAttribute("aria-controls", "app-sidebar-navigation");
      expect(toggleButton).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggleButton);
      const closeButton = await screen.findByRole("button", { name: /close sidebar/i });
      expect(closeButton).toHaveAttribute("aria-expanded", "true");

      fireEvent.keyDown(document, { key: "Escape" });
      const reopenedToggleButton = await screen.findByRole("button", { name: /open sidebar/i });
      await waitFor(() => {
        expect(reopenedToggleButton).toHaveAttribute("aria-expanded", "false");
      });

      unmount();
    }
  }, 45000);

  test("`/app/agent/tour` denies users without agent access", async () => {
    setAuthState({
      user: { id: "123", role: "citizen", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    renderRoute("/app/agent/tour");

    expect(await screen.findByRole("heading", { name: /Access Denied/i })).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have permission to access the agent workspace\./i),
    ).toBeInTheDocument();
  });

  test("`/app/agent/tour` allows agent access", async () => {
    setAuthState({
      user: { id: "123", role: "agent", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    const { getLocation } = renderRoute("/app/agent/tour");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/app/agent/tour");
    });
    expect(screen.queryByRole("heading", { name: /Access Denied/i })).not.toBeInTheDocument();
  });

  test("`/app/citizen/report` denies users without citizen access", async () => {
    setAuthState({
      user: { id: "123", role: "agent", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    renderRoute("/app/citizen/report");

    expect(await screen.findByRole("heading", { name: /Access Denied/i })).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have permission to access citizen tools\./i),
    ).toBeInTheDocument();
  });

  test("`/app/citizen/report` allows citizen access", async () => {
    setAuthState({
      user: { id: "123", role: "citizen", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    const { getLocation } = renderRoute("/app/citizen/report");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/app/citizen/report");
    });

    expect(screen.queryByRole("heading", { name: /Access Denied/i })).not.toBeInTheDocument();
  });

  test("legacy ticket app routes redirect to support workspace views", async () => {
    setAuthState({
      user: { id: "123", role: "agent", roles: [] },
      isLoading: false,
      isAuthenticated: true,
    });

    const legacyRoutes = [
      { route: "/app/tickets", hash: "#simple" },
      { route: "/app/tickets/advanced", hash: "#advanced" },
      { route: "/app/tickets/create", hash: "#create" },
    ];

    for (const legacyRoute of legacyRoutes) {
      const { getLocation, unmount } = renderRoute(legacyRoute.route);

      await waitFor(() => {
        expect(getLocation()?.pathname).toBe("/app/support");
        expect([legacyRoute.hash, ""].includes(getLocation()?.hash ?? "")).toBe(true);
      });

      unmount();
    }
  }, 20000);

  test("public marketing pages render concrete content", async () => {
    const { getLocation } = renderRoute("/privacy");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/privacy");
    });

    expect(await screen.findByRole("heading", { name: /Privacy notice overview/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Data categories processed/i),
    ).toBeInTheDocument();
  });

  test("`/faq` redirects to `/support`", async () => {
    const { getLocation } = renderRoute("/faq");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/support");
    });

    expect(await screen.findByRole("heading", { name: /Support operations playbook/i })).toBeInTheDocument();
  });

  test("removed legacy routes fall back to landing when unauthenticated", async () => {
    for (const route of ["/auth", "/dashboard", "/tickets", "/admin"]) {
      const { getLocation, unmount } = renderRoute(route);
      await waitFor(() => {
        expect(getLocation()?.pathname).toBe("/");
      });
      expect(
        await screen.findByRole(
          "heading",
          { name: /Bridge every ticket handoff/i },
          { timeout: 5000 },
        ),
      ).toBeInTheDocument();
      unmount();
    }
  }, 20000);
});
