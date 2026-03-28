import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportMobileError } from "@/monitoring/clientTelemetry";
import {
  clearPersistedSession,
  getCachedAccessToken,
} from "../api/core/tokenStore";
import {
  ApiRequestError,
  apiClient,
  buildApiUrl,
  createApiHeaders,
  createApiRequestError,
  ensureApiResponse,
  parseJsonResponse,
} from "../api/core/http";
import { emitSessionInvalidated } from "../api/core/sessionEvents";

vi.mock("@/lib/env", () => ({
  mobileApiBase: "https://mobile.ecotrack.test",
}));

vi.mock("@/monitoring/clientTelemetry", () => ({
  reportMobileError: vi.fn(),
}));

vi.mock("../api/core/tokenStore", () => ({
  clearPersistedSession: vi.fn(),
  getCachedAccessToken: vi.fn(),
}));

vi.mock("../api/core/requestId", () => ({
  createRequestId: vi.fn(() => "request-123"),
}));

vi.mock("../api/core/sessionEvents", () => ({
  emitSessionInvalidated: vi.fn(),
}));

describe("mobile http client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedAccessToken).mockReturnValue(null);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("builds URLs and default headers from the mobile API base", () => {
    vi.mocked(getCachedAccessToken).mockReturnValue("token-123");

    expect(buildApiUrl("api/health")).toBe("https://mobile.ecotrack.test/api/health");

    const headers = createApiHeaders();

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer token-123");
    expect(headers.get("x-request-id")).toBe("request-123");
  });

  it("parses JSON payloads defensively and handles empty or invalid responses", async () => {
    expect(await parseJsonResponse(new Response(null, { status: 204 }))).toBeNull();
    expect(
      await parseJsonResponse(
        new Response("plain-text", {
          status: 200,
          headers: {
            "content-type": "text/plain",
          },
        }),
      ),
    ).toBeNull();
    expect(
      await parseJsonResponse(
        new Response("not valid json", {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    ).toBeNull();
    await expect(
      parseJsonResponse(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it("invalidates the persisted session for 401 responses", async () => {
    const response = new Response(
      JSON.stringify({
        message: "Unauthorized",
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const error = await createApiRequestError(response);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(clearPersistedSession).toHaveBeenCalledTimes(1);
    expect(emitSessionInvalidated).toHaveBeenCalledTimes(1);
    expect(reportMobileError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "mobile.auth.session.invalidated",
        status: 401,
        type: "AUTH",
      }),
    );
  });

  it("reports server errors and throws request errors for failed responses", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Telemetry failure",
      }),
      {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      },
    );

    const error = await createApiRequestError(response);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.message).toBe("Telemetry failure");
    expect(reportMobileError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "mobile.api.request",
        status: 503,
        type: "SERVER",
      }),
    );

    await expect(ensureApiResponse(response)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("sends GET, POST, and PUT requests with the normalized headers and bodies", async () => {
    vi.mocked(getCachedAccessToken).mockReturnValue("token-123");
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ created: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ updated: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    await expect(apiClient.get("/api/status")).resolves.toEqual({ ok: true });
    await expect(apiClient.post("/api/report", { foo: "bar" })).resolves.toEqual({
      created: true,
    });
    await expect(apiClient.put("/api/report/1", { foo: "baz" })).resolves.toEqual({
      updated: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://mobile.ecotrack.test/api/status",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://mobile.ecotrack.test/api/report",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ foo: "bar" }),
        headers: expect.any(Headers),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://mobile.ecotrack.test/api/report/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ foo: "baz" }),
        headers: expect.any(Headers),
      }),
    );
  });
});
