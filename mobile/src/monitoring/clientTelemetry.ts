import { Platform } from "react-native";
import Constants from "expo-constants";

import { resolveMobileApiBase } from "@/lib/env";
import { captureMobileException, captureMobileMessage, initializeMobileSentry } from "@/monitoring/sentry";

type MobileErrorPayload = {
  type: string;
  message: string;
  context: string;
  severity?: string;
  status?: number;
  stack?: string | null;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

const scrubMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) {
    return undefined;
  }

  const filteredEntries = Object.entries(metadata).filter(([key]) => {
    const normalizedKey = key.toLowerCase();
    return (
      !normalizedKey.includes("token") &&
      !normalizedKey.includes("password") &&
      !normalizedKey.includes("authorization")
    );
  });

  return filteredEntries.length > 0 ? Object.fromEntries(filteredEntries) : undefined;
};

const buildMonitoringUrl = (path: string) => {
  const mobileApiBase = resolveMobileApiBase();

  if (!mobileApiBase) {
    return null;
  }

  return `${mobileApiBase}${path}`;
};

export const reportMobileError = async (payload: MobileErrorPayload) => {
  const { error, ...restPayload } = payload;
  const endpoint = buildMonitoringUrl("/api/errors");

  if (error instanceof Error) {
    captureMobileException(error, payload.context, {
      type: payload.type,
      severity: payload.severity ?? "medium",
      status: payload.status,
      ...payload.metadata,
    });
  } else {
    captureMobileMessage(payload.message, payload.context, {
      type: payload.type,
      severity: payload.severity ?? "medium",
      status: payload.status,
      stack: payload.stack ?? null,
      ...payload.metadata,
    }, payload.severity === "critical" ? "fatal" : "error");
  }

  if (!endpoint) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...restPayload,
        severity: payload.severity ?? "medium",
        stack: payload.stack ?? null,
        metadata: scrubMetadata(payload.metadata),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? "development",
        release: process.env.EXPO_PUBLIC_RELEASE_VERSION ?? Constants.expoConfig?.version ?? null,
        platform: Platform.OS,
        executionEnvironment: Constants.executionEnvironment
      })
    });
  } catch {
    // Keep telemetry best-effort only.
  }
};

export const initializeMobileErrorTracking = () => {
  initializeMobileSentry();

  const globalScope = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };

  const existingHandler = globalScope.ErrorUtils?.getGlobalHandler?.();
  if (!globalScope.ErrorUtils?.setGlobalHandler) {
    return () => undefined;
  }

  globalScope.ErrorUtils.setGlobalHandler((error, isFatal) => {
    void reportMobileError({
      type: "MOBILE_RUNTIME",
      message: error.message,
      context: isFatal ? "mobile.runtime.fatal" : "mobile.runtime",
      severity: isFatal ? "critical" : "high",
      stack: error.stack ?? null,
      error
    });

    existingHandler?.(error, isFatal);
  });

  return () => {
    if (existingHandler) {
      globalScope.ErrorUtils?.setGlobalHandler?.(existingHandler);
    }
  };
};
