import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { PersistedSessionSnapshot } from "../api/core/tokenStore";
import type { SessionUser } from "../api/modules/auth";
import { bootstrapSession } from "../providers/sessionBootstrap";

const persistedUser: SessionUser = {
  id: "user-1",
  email: "citizen@example.com",
  displayName: "Citizen One",
  avatarUrl: null,
  role: "citizen",
  roles: [
    {
      id: "role-1",
      name: "citizen"
    }
  ],
  isActive: true,
  provider: "local"
};

const supabaseSession = {
  access_token: "token-123"
} as Session;

const createSnapshot = (
  overrides: Partial<PersistedSessionSnapshot> = {}
): PersistedSessionSnapshot => ({
  accessToken: "persisted-token",
  user: persistedUser,
  ...overrides
});

describe("bootstrapSession", () => {
  it("returns anonymous and clears stale storage when Supabase has no active session", async () => {
    const resolveSessionUser = vi.fn(() => null);

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot({ accessToken: "stale-token" }),
      loadSession: async () => ({
        data: {
          session: null
        },
        error: null
      }),
      resolveSessionUser
    });

    expect(result).toEqual({
      authState: "anonymous",
      accessToken: null,
      user: null,
      shouldClearPersistedSession: true
    });
    expect(resolveSessionUser).toHaveBeenCalledWith(null);
  });

  it("returns the resolved Supabase session user when a live session exists", async () => {
    const resolveSessionUser = vi.fn(() => persistedUser);

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot(),
      loadSession: async () => ({
        data: {
          session: supabaseSession
        },
        error: null
      }),
      resolveSessionUser
    });

    expect(result).toEqual({
      authState: "authenticated",
      accessToken: "token-123",
      user: persistedUser,
      shouldClearPersistedSession: false
    });
  });

  it("falls back to the persisted snapshot when Supabase session discovery errors", async () => {
    const resolveSessionUser = vi.fn(() => null);

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot(),
      loadSession: async () => ({
        data: {
          session: null
        },
        error: new Error("Secure store unavailable")
      }),
      resolveSessionUser
    });

    expect(result).toEqual({
      authState: "authenticated",
      accessToken: "persisted-token",
      user: persistedUser,
      shouldClearPersistedSession: false
    });
  });

  it("stays anonymous when Supabase session discovery errors and no snapshot exists", async () => {
    const resolveSessionUser = vi.fn(() => null);

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot({ accessToken: null, user: null }),
      loadSession: async () => ({
        data: {
          session: null
        },
        error: new Error("Secure store unavailable")
      }),
      resolveSessionUser
    });

    expect(result).toEqual({
      authState: "anonymous",
      accessToken: null,
      user: null,
      shouldClearPersistedSession: false
    });
  });
});
