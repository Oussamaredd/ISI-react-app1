import React from "react";
import { screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionProvider, useSession } from "@/providers/SessionProvider";
import { authApi } from "@api/modules/auth";
import {
  clearPersistedSession,
  setSessionSnapshot,
} from "@api/core/tokenStore";
import { subscribeToSessionInvalidated } from "@api/core/sessionEvents";
import { bootstrapSession } from "@/providers/sessionBootstrap";
import { mobileFireEvent, renderMobileScreen } from "./test-utils";

vi.mock("@api/modules/auth", () => ({
  authApi: {
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    onAuthStateChange: vi.fn(),
    resolveSessionUser: vi.fn(),
    signup: vi.fn(),
  },
}));

vi.mock("@api/core/tokenStore", () => ({
  clearPersistedSession: vi.fn(),
  hydrateSessionSnapshot: vi.fn(),
  setSessionSnapshot: vi.fn(),
}));

vi.mock("@api/core/sessionEvents", () => ({
  subscribeToSessionInvalidated: vi.fn(),
}));

vi.mock("@/providers/sessionBootstrap", () => ({
  bootstrapSession: vi.fn(),
}));

const managerUser = {
  id: "manager-1",
  email: "manager@example.com",
  displayName: "Manager",
  avatarUrl: null,
  role: "manager",
  roles: [
    {
      id: "role-1",
      name: "manager",
    },
  ],
  isActive: true,
  provider: "local" as const,
};

const SessionProbe = () => {
  const session = useSession();

  return (
    <div>
      <span data-testid="auth-state">{session.authState}</span>
      <span data-testid="auth-user">{session.user?.displayName ?? "none"}</span>
      <span data-testid="auth-loading">{String(session.isLoading)}</span>
      <button
        type="button"
        onClick={() => {
          void session.signIn({
            email: "manager@example.com",
            password: "correcthorse",
          });
        }}
      >
        Sign in action
      </button>
      <button
        type="button"
        onClick={() => {
          void session.signUp({
            email: "manager@example.com",
            password: "correcthorse",
            displayName: "Manager",
          });
        }}
      >
        Sign up action
      </button>
      <button
        type="button"
        onClick={() => {
          void session.signOut();
        }}
      >
        Sign out action
      </button>
      <button
        type="button"
        onClick={() => {
          void session.refreshSession();
        }}
      >
        Refresh action
      </button>
    </div>
  );
};

describe("SessionProvider", () => {
  let sessionInvalidatedListener: (() => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionInvalidatedListener = null;

    vi.mocked(bootstrapSession).mockResolvedValue({
      authState: "anonymous",
      accessToken: null,
      user: null,
      shouldClearPersistedSession: false,
    });
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: "token-123",
      user: managerUser,
    });
    vi.mocked(authApi.signup).mockResolvedValue({
      accessToken: "signup-token",
      user: managerUser,
    });
    vi.mocked(authApi.getSession).mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    } as never);
    vi.mocked(authApi.onAuthStateChange).mockImplementation(() => {
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as never;
    });
    vi.mocked(authApi.logout).mockResolvedValue({
      success: true,
    } as never);
    vi.mocked(subscribeToSessionInvalidated).mockImplementation((listener) => {
      sessionInvalidatedListener = listener;

      return () => {
        sessionInvalidatedListener = null;
      };
    });
  });

  it("hydrates the bootstrap result and persists a fresh authenticated user when required", async () => {
    vi.mocked(bootstrapSession).mockResolvedValue({
      authState: "authenticated",
      accessToken: "bootstrap-token",
      user: managerUser,
      shouldClearPersistedSession: false,
    });

    renderMobileScreen(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
      expect(screen.getByTestId("auth-user").textContent).toBe("Manager");
      expect(screen.getByTestId("auth-loading").textContent).toBe("false");
    });

    expect(setSessionSnapshot).toHaveBeenCalledWith({
      accessToken: "bootstrap-token",
      user: managerUser,
    });
  });

  it("signs in directly when the login response already contains a session", async () => {
    renderMobileScreen(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in action/i }));

    await waitFor(() => {
      expect(setSessionSnapshot).toHaveBeenCalledWith({
        accessToken: "token-123",
        user: managerUser,
      });
      expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
      expect(screen.getByTestId("auth-user").textContent).toBe("Manager");
    });
  });

  it("exchanges a login code, signs up, signs out, and responds to invalidation events", async () => {
    vi.mocked(bootstrapSession)
      .mockResolvedValueOnce({
        authState: "authenticated",
        accessToken: "bootstrap-token",
        user: managerUser,
        shouldClearPersistedSession: false,
      })
      .mockResolvedValueOnce({
        authState: "authenticated",
        accessToken: "refreshed-token",
        user: {
          ...managerUser,
          displayName: "Refreshed Manager",
        },
        shouldClearPersistedSession: true,
      });
    vi.mocked(authApi.logout).mockRejectedValue(new Error("offline"));

    renderMobileScreen(
      <SessionProvider>
        <SessionProbe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("authenticated");
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in action/i }));
    await waitFor(() => {
      expect(setSessionSnapshot).toHaveBeenCalledWith({
        accessToken: "token-123",
        user: managerUser,
      });
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign up action/i }));
    await waitFor(() => {
      expect(authApi.signup).toHaveBeenCalledWith(
        "manager@example.com",
        "correcthorse",
        "Manager",
      );
      expect(setSessionSnapshot).toHaveBeenCalledWith({
        accessToken: "signup-token",
        user: managerUser,
      });
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Refresh action/i }));
    await waitFor(() => {
      expect(clearPersistedSession).toHaveBeenCalled();
      expect(setSessionSnapshot).toHaveBeenCalledWith({
        accessToken: "refreshed-token",
        user: {
          ...managerUser,
          displayName: "Refreshed Manager",
        },
      });
      expect(screen.getByTestId("auth-user").textContent).toBe("Refreshed Manager");
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign out action/i }));
    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalled();
      expect(clearPersistedSession).toHaveBeenCalled();
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
      expect(screen.getByTestId("auth-user").textContent).toBe("none");
    });

    expect(sessionInvalidatedListener).toBeTruthy();
    sessionInvalidatedListener?.();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state").textContent).toBe("anonymous");
    });
  });

  it("throws when useSession is consumed outside the provider", () => {
    expect(() => {
      renderMobileScreen(<SessionProbe />);
    }).toThrow("useSession must be used inside SessionProvider.");
  });
});
