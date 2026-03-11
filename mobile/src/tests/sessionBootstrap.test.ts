import { describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../api/core/http";
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

const createSnapshot = (
  overrides: Partial<PersistedSessionSnapshot> = {}
): PersistedSessionSnapshot => ({
  accessToken: "token-123",
  user: persistedUser,
  ...overrides
});

describe("bootstrapSession", () => {
  it("returns anonymous and clears stale storage when no token is available", async () => {
    const loadStatus = vi.fn();

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot({ accessToken: null }),
      loadStatus
    });

    expect(result).toEqual({
      authState: "anonymous",
      user: null,
      shouldPersistUser: false,
      shouldClearPersistedSession: true
    });
    expect(loadStatus).not.toHaveBeenCalled();
  });

  it("persists the fresh server user when auth status confirms the session", async () => {
    const loadStatus = vi.fn(async () => ({
      authenticated: true,
      user: {
        ...persistedUser,
        displayName: "Fresh Citizen"
      }
    }));

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot(),
      loadStatus
    });

    expect(result).toEqual({
      authState: "authenticated",
      user: {
        ...persistedUser,
        displayName: "Fresh Citizen"
      },
      shouldPersistUser: true,
      shouldClearPersistedSession: false
    });
  });

  it("keeps the cached user when startup validation fails for a transport error", async () => {
    const loadStatus = vi.fn(async () => {
      throw new Error("Network request failed");
    });

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot(),
      loadStatus
    });

    expect(result).toEqual({
      authState: "authenticated",
      user: persistedUser,
      shouldPersistUser: false,
      shouldClearPersistedSession: false
    });
  });

  it("clears the cached session when the token is rejected", async () => {
    const loadStatus = vi.fn(async () => {
      throw new ApiRequestError("Unauthorized", 401, null);
    });

    const result = await bootstrapSession({
      hydrateSessionSnapshot: async () => createSnapshot(),
      loadStatus
    });

    expect(result).toEqual({
      authState: "anonymous",
      user: null,
      shouldPersistUser: false,
      shouldClearPersistedSession: true
    });
  });
});
