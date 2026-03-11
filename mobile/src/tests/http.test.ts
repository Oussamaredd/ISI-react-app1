import { afterEach, describe, expect, it } from "vitest";

import { createApiHeaders } from "../api/core/http";
import {
  primeAccessTokenCacheForTests,
  resetAccessTokenStoreForTests
} from "../api/core/tokenStore";

describe("createApiHeaders", () => {
  afterEach(() => {
    resetAccessTokenStoreForTests();
  });

  it("injects a bearer token and request id when a session token exists", () => {
    primeAccessTokenCacheForTests("token-123");

    const headers = createApiHeaders();

    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("x-request-id")).toBeTruthy();
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("preserves explicit authorization headers", () => {
    primeAccessTokenCacheForTests("token-123");

    const headers = createApiHeaders({
      Authorization: "Bearer override-token"
    });

    expect(headers.get("Authorization")).toBe("Bearer override-token");
  });
});
