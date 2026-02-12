import { screen, waitFor } from "@testing-library/react";
import { vi, describe, test, beforeEach, afterEach, expect } from "vitest";
import App from "../App";
import { renderWithProviders } from "./test-utils";

const mockUseCurrentUser = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
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
      json: async () => ({ tickets: [], hotels: [] }),
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
      await screen.findByRole("heading", { name: /Bridge every ticket handoff/i }),
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

  test("`/auth` renders auth page when unauthenticated", async () => {
    renderRoute("/auth");
    expect(await screen.findByText(/Authenticate to access your workspace/i)).toBeInTheDocument();
  });

  test("`/auth` redirects to `/app/dashboard` when authenticated", async () => {
    setAuthState({
      user: { id: "123", name: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    const { getLocation } = renderRoute("/auth");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/app/dashboard");
    });
  });

  test("`/app/*` redirects unauthenticated users to `/auth`", async () => {
    const { getLocation } = renderRoute("/app/dashboard");

    await waitFor(() => {
      expect(getLocation()?.pathname).toBe("/auth");
    });

    expect(getLocation()?.search).toContain("next=");
  });

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

  test("legacy app routes redirect to `/app/*`", async () => {
    setAuthState({
      user: { id: "123", name: "Test User" },
      isLoading: false,
      isAuthenticated: true,
    });

    const routes = [
      ["/dashboard", "/app/dashboard"],
      ["/tickets", "/app/tickets"],
      ["/tickets/advanced", "/app/tickets/advanced"],
      ["/tickets/create", "/app/tickets/create"],
      ["/admin", "/app/admin"],
    ];

    for (const [legacyPath, newPath] of routes) {
      const { getLocation, unmount } = renderRoute(legacyPath);
      await waitFor(() => {
        expect(getLocation()?.pathname).toBe(newPath);
      });
      unmount();
    }
  });
});
