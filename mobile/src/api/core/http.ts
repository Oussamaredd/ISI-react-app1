import { mobileApiBase } from "@/lib/env";

import { clearAccessToken, getCachedAccessToken } from "./tokenStore";
import { createRequestId } from "./requestId";
import { emitSessionInvalidated } from "./sessionEvents";

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

const resolveApiBase = () => {
  if (!mobileApiBase) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for the mobile API client.");
  }

  return mobileApiBase;
};

const resolveApiErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === "object") {
    const errorPayload = payload as {
      error?: unknown;
      message?: unknown;
    };

    if (typeof errorPayload.error === "string" && errorPayload.error.trim().length > 0) {
      return errorPayload.error;
    }

    if (typeof errorPayload.message === "string" && errorPayload.message.trim().length > 0) {
      return errorPayload.message;
    }
  }

  return `HTTP ${status}`;
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveApiBase()}${normalizedPath}`;
};

export const createApiHeaders = (headers?: HeadersInit) => {
  const resolvedHeaders = new Headers(headers ?? {});

  if (!resolvedHeaders.has("Accept")) {
    resolvedHeaders.set("Accept", "application/json");
  }

  if (!resolvedHeaders.has("x-request-id")) {
    resolvedHeaders.set("x-request-id", createRequestId());
  }

  const token = getCachedAccessToken();
  if (token && !resolvedHeaders.has("Authorization")) {
    resolvedHeaders.set("Authorization", `Bearer ${token}`);
  }

  return resolvedHeaders;
};

export const parseJsonResponse = async (response: Response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const createApiRequestError = async (response: Response) => {
  const payload = await parseJsonResponse(response);

  if (response.status === 401) {
    await clearAccessToken();
    emitSessionInvalidated();
  }

  return new ApiRequestError(
    resolveApiErrorMessage(payload, response.status),
    response.status,
    payload
  );
};

export const ensureApiResponse = async (response: Response) => {
  if (!response.ok) {
    throw await createApiRequestError(response);
  }

  return response;
};

const authorizedFetch = async (path: string, init: RequestInit = {}) => {
  const { headers, ...rest } = init;

  return fetch(buildApiUrl(path), {
    ...rest,
    headers: createApiHeaders(headers)
  });
};

const parseBody = (response: Response) => parseJsonResponse(response);

export const apiClient = {
  get: async <T>(path: string, init: RequestInit = {}) => {
    const response = await authorizedFetch(path, init);
    await ensureApiResponse(response);
    return parseBody(response) as Promise<T>;
  },

  post: async <T>(path: string, body?: unknown, init: RequestInit = {}) => {
    const response = await authorizedFetch(path, {
      method: "POST",
      ...init,
      headers: createApiHeaders({
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }),
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    await ensureApiResponse(response);
    return parseBody(response) as Promise<T>;
  },

  put: async <T>(path: string, body?: unknown, init: RequestInit = {}) => {
    const response = await authorizedFetch(path, {
      method: "PUT",
      ...init,
      headers: createApiHeaders({
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }),
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    await ensureApiResponse(response);
    return parseBody(response) as Promise<T>;
  }
};
