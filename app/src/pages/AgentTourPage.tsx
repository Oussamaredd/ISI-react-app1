import { useEffect, useMemo, useState } from "react";
import AgentRouteMap from "../components/agent/AgentRouteMap";
import {
  type TourRouteGeometry,
  useAgentTour,
  useAnomalyTypes,
  useReportAnomaly,
  useStartAgentTour,
  useTourActivity,
  useValidateTourStop,
  useZoneContainers,
} from "../hooks/useAgentTours";
import "../styles/OperationsPages.css";

type TourStop = {
  id: string;
  stopOrder: number;
  status: string;
  eta?: string | null;
  completedAt?: string | null;
  containerId: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

type RouteSummary = {
  totalStops: number;
  completedStops: number;
  remainingStops: number;
  activeStopOrder?: number | null;
  completionPercent: number;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  isOverdue: boolean;
};

type DepotLocation = {
  label?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type TourActivityRow = {
  id: string;
  type: string;
  createdAt: string;
  details: unknown;
  actorDisplayName?: string | null;
};

type CapturedPosition = {
  latitude: string;
  longitude: string;
};

const normalizeStatus = (status: string | null | undefined) =>
  status?.trim().toLowerCase() ?? "";

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallbackMessage;

const formatDateTime = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleString() : "N/A";

const formatTime = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";

const formatDistanceKm = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} km` : "N/A";

const formatCoordinates = (latitude?: string | null, longitude?: string | null) => {
  const parsedLatitude = latitude == null ? Number.NaN : Number(latitude);
  const parsedLongitude = longitude == null ? Number.NaN : Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return "Location unavailable";
  }

  return `${parsedLatitude.toFixed(4)}, ${parsedLongitude.toFixed(4)}`;
};

const readActivityDetails = (details: unknown) =>
  details && typeof details === "object" ? (details as Record<string, unknown>) : {};

const describeActivity = (item: TourActivityRow) => {
  const details = readActivityDetails(item.details);

  switch (item.type) {
    case "tour_started":
      return {
        title: "Tour started",
        summary: "Agent marked the route as in progress.",
      };
    case "collection_validated": {
      const volume = details.volumeLiters;

      return {
        title: "Collection validated",
        summary:
          typeof volume === "number"
            ? `${volume} liters recorded at the stop.`
            : "Collection volume recorded.",
      };
    }
    case "anomaly_reported": {
      const severity =
        typeof details.severity === "string" && details.severity.trim().length > 0
          ? details.severity
          : "unspecified";
      const comments =
        typeof details.comments === "string" && details.comments.trim().length > 0
          ? details.comments
          : null;

      return {
        title: "Anomaly reported",
        summary: comments
          ? `${severity} severity. ${comments}`
          : `${severity} severity alert sent to the manager queue.`,
      };
    }
    default:
      return {
        title: item.type,
        summary: "Operational activity recorded.",
      };
  }
};

const getStopToneClass = (status: string) => {
  switch (normalizeStatus(status)) {
    case "active":
      return "ops-chip ops-chip-success";
    case "completed":
      return "ops-chip ops-chip-info";
    default:
      return "ops-chip ops-chip-warning";
  }
};

const getTourStatusToneClass = (status: string) => {
  switch (normalizeStatus(status)) {
    case "completed":
      return "ops-chip ops-chip-info";
    case "in_progress":
      return "ops-chip ops-chip-success";
    default:
      return "ops-chip ops-chip-warning";
  }
};

const getRouteStatusToneClass = (routeGeometry: TourRouteGeometry | null) => {
  if (!routeGeometry) {
    return "ops-chip ops-chip-info";
  }

  return routeGeometry.source === "live" ? "ops-chip ops-chip-success" : "ops-chip ops-chip-warning";
};

const captureCurrentPosition = () =>
  new Promise<CapturedPosition | null>((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  });

export default function AgentTourPage() {
  const [useManualFallback, setUseManualFallback] = useState(false);
  const [volumeLiters, setVolumeLiters] = useState("");
  const [validationNotes, setValidationNotes] = useState("");
  const [anomalyTypeId, setAnomalyTypeId] = useState("");
  const [anomalySeverity, setAnomalySeverity] = useState("medium");
  const [anomalyComments, setAnomalyComments] = useState("");
  const [anomalyPhotoUrl, setAnomalyPhotoUrl] = useState("");
  const [capturedPosition, setCapturedPosition] = useState<CapturedPosition | null>(null);
  const [isCapturingPosition, setIsCapturingPosition] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("success");

  const agentTourQuery = useAgentTour();
  const startTourMutation = useStartAgentTour();
  const validateStopMutation = useValidateTourStop();
  const anomalyTypesQuery = useAnomalyTypes();
  const reportAnomalyMutation = useReportAnomaly();

  const tour = (agentTourQuery.data ?? null) as
    | {
        id: string;
        name: string;
        status: string;
        zoneId?: string | null;
        zoneName?: string | null;
        scheduledFor?: string;
        depot?: DepotLocation | null;
        stops?: TourStop[];
        routeGeometry?: TourRouteGeometry | null;
        routeSummary?: RouteSummary;
      }
    | null;

  const stops = Array.isArray(tour?.stops) ? tour.stops : [];
  const zoneContainersQuery = useZoneContainers(tour?.zoneId ?? null);
  const zoneContainers = Array.isArray(zoneContainersQuery.data) ? zoneContainersQuery.data : [];
  const routeSummary = tour?.routeSummary ?? null;
  const routeGeometry = tour?.routeGeometry ?? null;
  const depotLocation = tour?.depot ?? null;
  const zoneContainerCount = zoneContainers.length;
  const uncoveredZoneContainerCount = useMemo(() => {
    if (zoneContainers.length === 0 || stops.length === 0) {
      return zoneContainers.length;
    }

    const routedContainerIds = new Set(stops.map((stop) => stop.containerId));
    return zoneContainers.filter((container) => !routedContainerIds.has(container.id)).length;
  }, [stops, zoneContainers]);
  const activeStop = useMemo(
    () =>
      stops.find((stop) => normalizeStatus(stop.status) === "active") ??
      stops.find((stop) => normalizeStatus(stop.status) === "pending") ??
      null,
    [stops],
  );

  useEffect(() => {
    setUseManualFallback(false);
    setCapturedPosition(null);
  }, [activeStop?.id]);

  const nextStop = useMemo(
    () =>
      activeStop
        ? stops.find(
            (stop) =>
              stop.id !== activeStop.id &&
              stop.stopOrder > activeStop.stopOrder &&
              normalizeStatus(stop.status) !== "completed",
          ) ?? null
        : null,
    [activeStop, stops],
  );

  const activityQuery = useTourActivity(tour?.id);
  const activityRows =
    ((activityQuery.data as { activity?: TourActivityRow[] } | undefined)?.activity ?? []);
  const hasGeolocationSupport =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const totalStops = routeSummary?.totalStops ?? stops.length;
  const completedStops =
    routeSummary?.completedStops ??
    stops.filter((stop) => normalizeStatus(stop.status) === "completed").length;
  const remainingStops =
    routeSummary?.remainingStops ?? Math.max(0, totalStops - completedStops);
  const completionPercent =
    routeSummary?.completionPercent ??
    (totalStops === 0 ? 0 : Math.round((completedStops / totalStops) * 100));
  const displayedDistanceKm = routeGeometry?.distanceKm ?? routeSummary?.totalDistanceKm ?? null;
  const displayedDurationMinutes =
    routeGeometry?.durationMinutes ?? routeSummary?.estimatedDurationMinutes ?? 0;
  const routeStatusLabel = routeGeometry
    ? routeGeometry.source === "live"
      ? `Stored road route (${routeGeometry.provider})`
      : `Stored fallback route (${routeGeometry.provider})`
    : stops.length >= 2
      ? "Route pending persistence"
      : "Not enough mapped stops";
  const tourStatus = normalizeStatus(tour?.status);
  const canStartTour =
    Boolean(tour) && totalStops > 0 && tourStatus !== "in_progress" && tourStatus !== "completed";
  const anomalyTypes =
    ((anomalyTypesQuery.data as {
      anomalyTypes?: Array<{ id: string; label: string }>;
    } | undefined)?.anomalyTypes ?? []);
  const isUsingCachedTour = agentTourQuery.dataSource === "cache";
  const isOverdueTour = Boolean(routeSummary?.isOverdue && tourStatus !== "completed");
  const isOverdueActiveRun = Boolean(routeSummary?.isOverdue && tourStatus === "in_progress");
  const shouldOfferCacheBypass = isUsingCachedTour || isOverdueTour;

  const refreshTour = async (options?: { clearCache?: boolean }) => {
    setStatusMessage("");

    try {
      const result = agentTourQuery.refetchFromServer
        ? await agentTourQuery.refetchFromServer(options)
        : await (async () => {
            if (options?.clearCache) {
              agentTourQuery.clearCachedTour?.();
            }

            return agentTourQuery.refetch();
          })();
      if (result.error) {
        throw result.error;
      }

      setStatusTone("info");
      setStatusMessage(
        options?.clearCache
          ? "Cached tour cleared. Requested a fresh assignment snapshot from the server."
          : "Tour data refreshed.",
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        getErrorMessage(
          error,
          options?.clearCache
            ? "Unable to reload a fresh assignment snapshot from the server."
            : "Unable to refresh the assigned tour.",
        ),
      );
    }
  };

  const handleStartTour = async () => {
    if (!tour) {
      return;
    }

    setStatusMessage("");

    try {
      const response = (await startTourMutation.mutateAsync(tour.id)) as {
        firstActiveStopId?: string | null;
      };
      setStatusTone("success");
      setStatusMessage(
        response.firstActiveStopId
          ? "Tour started. The first stop is now active."
          : "Tour started. No pending stops remain on this route.",
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(getErrorMessage(error, "Unable to start the assigned tour."));
    }
  };

  const handleCapturePosition = async () => {
    if (!hasGeolocationSupport) {
      setStatusTone("error");
      setStatusMessage("This device does not expose geolocation to the app.");
      return;
    }

    setStatusMessage("");
    setIsCapturingPosition(true);

    try {
      const nextPosition = await captureCurrentPosition();
      if (!nextPosition) {
        setStatusTone("error");
        setStatusMessage("Location capture was unavailable. Validation can still continue.");
        return;
      }

      setCapturedPosition(nextPosition);
      setStatusTone("info");
      setStatusMessage("Device location attached to the active stop.");
    } finally {
      setIsCapturingPosition(false);
    }
  };

  const submitValidation = async () => {
    if (!tour || !activeStop) {
      return;
    }

    const parsedVolume = Number(volumeLiters);
    if (!Number.isFinite(parsedVolume) || parsedVolume < 0) {
      setStatusTone("error");
      setStatusMessage("Enter a valid non-negative collection volume before validating.");
      return;
    }

    setStatusMessage("");

    try {
      const response = (await validateStopMutation.mutateAsync({
        tourId: tour.id,
        stopId: activeStop.id,
        volumeLiters: parsedVolume,
        containerId: useManualFallback ? activeStop.containerId : undefined,
        latitude: capturedPosition?.latitude,
        longitude: capturedPosition?.longitude,
        notes: validationNotes.trim() || undefined,
      })) as {
        nextStopId?: string | null;
        alreadyValidated?: boolean;
      };

      setStatusTone("success");
      setStatusMessage(
        response.alreadyValidated
          ? "This stop was already validated. The page is showing the latest route state."
          : response.nextStopId
            ? "Collection validated. The route advanced to the next stop."
            : "Collection validated. All stops on this tour are complete.",
      );
      setVolumeLiters("");
      setValidationNotes("");
      setCapturedPosition(null);
      setUseManualFallback(false);
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(getErrorMessage(error, "Failed to validate the active stop."));
    }
  };

  const submitAnomaly = async () => {
    if (!tour || !anomalyTypeId) {
      return;
    }

    const trimmedPhotoUrl = anomalyPhotoUrl.trim();
    if (trimmedPhotoUrl && !/^https?:\/\//i.test(trimmedPhotoUrl)) {
      setStatusTone("error");
      setStatusMessage("Photo URL must begin with http:// or https://.");
      return;
    }

    setStatusMessage("");

    try {
      const response = (await reportAnomalyMutation.mutateAsync({
        tourId: tour.id,
        anomalyTypeId,
        tourStopId: activeStop?.id,
        comments: anomalyComments.trim() || undefined,
        photoUrl: trimmedPhotoUrl || undefined,
        severity: anomalySeverity,
      })) as { managerAlertTriggered?: boolean };

      setStatusTone("success");
      setStatusMessage(
        response.managerAlertTriggered
          ? "Anomaly reported and escalated to the manager queue."
          : "Anomaly reported.",
      );
      setAnomalyComments("");
      setAnomalyPhotoUrl("");
      setAnomalySeverity("medium");
      setAnomalyTypeId("");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(getErrorMessage(error, "Failed to report the anomaly."));
    }
  };

  if (agentTourQuery.isLoading) {
    return (
      <section className="ops-page">
        <p className="ops-status ops-status-info">Loading assigned tour...</p>
      </section>
    );
  }

  if (agentTourQuery.isError) {
    return (
      <section className="ops-page">
        <header className="ops-hero">
          <h1>Daily Agent Tour</h1>
          <p>
            The assigned route could not be loaded right now. Check connectivity, then refresh.
          </p>
          <p className="ops-helper">
            This retained web route supports recovery and accessibility. EcoTrack still treats agent execution as a mobile-first workflow when device capabilities are available.
          </p>
          <div className="ops-actions ops-mt-lg">
            <button
              type="button"
              className="ops-btn ops-btn-outline"
              onClick={() => {
                void refreshTour();
              }}
              disabled={agentTourQuery.isFetching}
            >
              {agentTourQuery.isFetching ? "Refreshing..." : "Retry"}
            </button>
          </div>
        </header>
        <p className="ops-status ops-status-error" role="status" aria-live="polite">
          {getErrorMessage(agentTourQuery.error, "Unable to load the assigned tour.")}
        </p>
      </section>
    );
  }

  if (!tour) {
    return (
      <section className="ops-page">
        <header className="ops-hero">
          <h1>Daily Agent Tour</h1>
          <p>No actionable tour is assigned to your account right now.</p>
          <p className="ops-helper">
            This retained web route supports recovery and demos. Daily field execution remains mobile-first in the core product story.
          </p>
          <div className="ops-actions ops-mt-lg">
            <button
              type="button"
              className="ops-btn ops-btn-outline"
              onClick={() => {
                void refreshTour();
              }}
              disabled={agentTourQuery.isFetching}
            >
              {agentTourQuery.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <div className="ops-hero-head">
          <div>
            <h1>{tour.name}</h1>
            <p>
              Zone: {tour.zoneName ?? "Unassigned"} | Scheduled {formatDateTime(tour.scheduledFor)}
            </p>
            <p className="ops-helper">
              Web companion for review, recovery, and accessibility. Mobile remains the primary field-execution surface for agents.
            </p>
          </div>
          <span className={getTourStatusToneClass(tour.status)}>Status: {tour.status}</span>
        </div>

        <div className="ops-grid ops-grid-4 ops-mt-lg">
          <div className="ops-kpi-card">
            <p className="ops-kpi-label">Progress</p>
            <p className="ops-kpi-value">{completionPercent}%</p>
            <div className="ops-progress-track ops-mt-xs" aria-hidden="true">
              <div
                className="ops-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
              />
            </div>
          </div>
          <div className="ops-kpi-card">
            <p className="ops-kpi-label">Completed Stops</p>
            <p className="ops-kpi-value">
              {completedStops}/{totalStops}
            </p>
          </div>
          <div className="ops-kpi-card">
            <p className="ops-kpi-label">Remaining Stops</p>
            <p className="ops-kpi-value">{remainingStops}</p>
          </div>
          <div className="ops-kpi-card">
            <p className="ops-kpi-label">Estimated Route</p>
            <p className="ops-kpi-value">{formatDistanceKm(displayedDistanceKm)}</p>
            <p className="ops-list-meta">
              {displayedDurationMinutes > 0
                ? `${displayedDurationMinutes} min`
                : "Duration pending"}
            </p>
          </div>
        </div>

        <div className="ops-actions ops-mt-lg">
          <button
            type="button"
            className="ops-btn ops-btn-success"
            disabled={!canStartTour || startTourMutation.isPending}
            onClick={handleStartTour}
          >
            {startTourMutation.isPending
              ? "Starting..."
              : tourStatus === "in_progress"
                ? "Current Run Active"
                : tourStatus === "completed"
                  ? "Tour Completed"
                  : "Start Tour"}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={() => {
              void refreshTour();
            }}
            disabled={agentTourQuery.isFetching}
          >
            {agentTourQuery.isFetching ? "Refreshing..." : "Refresh Tour Data"}
          </button>
          {shouldOfferCacheBypass ? (
            <button
              type="button"
              className="ops-btn ops-btn-outline"
              onClick={() => {
                void refreshTour({ clearCache: true });
              }}
              disabled={agentTourQuery.isFetching}
            >
              {agentTourQuery.isFetching ? "Reloading..." : "Reload Without Cache"}
            </button>
          ) : null}
          {isOverdueTour ? (
            <span className="ops-chip ops-chip-danger">
              {isOverdueActiveRun
                ? "Active run is overdue. Continue only if this is still the live round; otherwise reload from the server before proceeding."
                : "Scheduled time has passed. Reload the assignment before starting."}
            </span>
          ) : null}
          {isUsingCachedTour ? (
            <span className="ops-chip ops-chip-warning">
              Offline snapshot shown. Reload without cache once connectivity returns.
            </span>
          ) : null}
        </div>
      </header>

      <article className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Route Overview</h2>
            <p className="ops-card-intro">
              Persisted route data from the API. The line and numbered markers show the routed stop sequence. Zone containers are still loaded paginated in the background so the page can verify route coverage against the assigned zone.
            </p>
          </div>
          <div className="ops-card-head-badges">
            {activeStop ? (
              <span className="ops-chip ops-chip-info">Current stop #{activeStop.stopOrder}</span>
            ) : (
              <span className="ops-chip ops-chip-info">No active stop</span>
            )}
            <span className="ops-chip ops-chip-info">
              {zoneContainersQuery.isLoading ? "Loading zone map..." : `${zoneContainerCount} mapped containers`}
            </span>
            {!zoneContainersQuery.isLoading && uncoveredZoneContainerCount > 0 ? (
              <span className="ops-chip ops-chip-warning">
                {uncoveredZoneContainerCount} mapped containers are not assigned to this route
              </span>
            ) : null}
            <span className={getRouteStatusToneClass(routeGeometry)}>{routeStatusLabel}</span>
          </div>
        </div>
        <div className="ops-inline-summary">
          <div>
            <p className="ops-subtle">Depot: {depotLocation?.label?.trim() || "Zone depot not configured"}</p>
            <p className="ops-subtle">
              Start coordinates: {formatCoordinates(depotLocation?.latitude, depotLocation?.longitude)}
            </p>
          </div>
          <div>
            <p className="ops-subtle">Routed stops: {stops.length}</p>
            <p className="ops-subtle">
              Route coverage: {Math.max(0, zoneContainerCount - uncoveredZoneContainerCount)} / {zoneContainerCount}
            </p>
          </div>
        </div>
        <AgentRouteMap
          stops={stops}
          depot={depotLocation}
          routeGeometry={routeGeometry}
        />
      </article>

      <article className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Ordered Stops</h2>
            <p className="ops-card-intro">
              Review the route sequence, ETA, and coordinate quality before moving.
            </p>
          </div>
          <span className="ops-chip ops-chip-info">{totalStops} stops</span>
        </div>

        <ul className="ops-list ops-mt-sm">
          {stops.map((stop) => {
            const isCurrentStop = activeStop?.id === stop.id;

            return (
              <li
                key={stop.id}
                className={`ops-list-item ${isCurrentStop ? "ops-list-item-active" : ""}`}
              >
                <div className="ops-stop-head">
                  <p>
                    <strong>#{stop.stopOrder}</strong> - {stop.containerCode} - {stop.containerLabel}
                  </p>
                  <span className={getStopToneClass(stop.status)}>
                    {isCurrentStop ? "Current stop" : `Status: ${stop.status}`}
                  </span>
                </div>
                <div className="ops-stop-meta-grid">
                  <p className="ops-list-meta">ETA: {formatTime(stop.eta)}</p>
                  <p className="ops-list-meta">
                    Coordinates: {formatCoordinates(stop.latitude, stop.longitude)}
                  </p>
                  <p className="ops-list-meta">
                    Completed: {formatDateTime(stop.completedAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="ops-card ops-form">
        <div className="ops-card-head">
          <div>
            <h2>Validate Active Stop</h2>
            <p className="ops-card-intro">
              Confirm the expected container, record volume, and optionally attach live location.
            </p>
          </div>
          {activeStop ? (
            <span className="ops-chip ops-chip-success">Stop #{activeStop.stopOrder}</span>
          ) : null}
        </div>

        {activeStop ? (
          <>
            <div className="ops-inline-summary">
              <div>
                <p className="ops-subtle">
                  Active stop: {activeStop.containerCode} - {activeStop.containerLabel}
                </p>
                <p className="ops-subtle">Target ETA: {formatTime(activeStop.eta)}</p>
                <p className="ops-subtle">
                  {nextStop
                    ? `Next queued stop: #${nextStop.stopOrder} - ${nextStop.containerCode}`
                    : "This is the final queued stop on the route."}
                </p>
              </div>
            </div>

            <div className="ops-field">
              <label htmlFor="agent-tour-volume-liters" className="ops-label">
                Volume (liters)
              </label>
              <input
                id="agent-tour-volume-liters"
                className="ops-input"
                type="number"
                min={0}
                step={1}
                value={volumeLiters}
                onChange={(event) => setVolumeLiters(event.target.value)}
                placeholder="e.g. 120"
              />
            </div>

            <label className="ops-check">
              <input
                type="checkbox"
                checked={useManualFallback}
                onChange={(event) => setUseManualFallback(event.target.checked)}
              />
              Confirm the expected stop container ({activeStop.containerCode}) manually.
            </label>

            <div className="ops-field">
              <label htmlFor="agent-tour-validation-notes" className="ops-label">
                Notes (optional)
              </label>
              <textarea
                id="agent-tour-validation-notes"
                className="ops-textarea"
                rows={3}
                value={validationNotes}
                onChange={(event) => setValidationNotes(event.target.value)}
                placeholder="Add anything the next shift or dispatcher should know."
              />
            </div>

            <div className="ops-inline-actions">
              <button
                type="button"
                className="ops-btn ops-btn-outline"
                onClick={handleCapturePosition}
                disabled={!hasGeolocationSupport || isCapturingPosition}
              >
                {isCapturingPosition
                  ? "Capturing..."
                  : capturedPosition
                    ? "Refresh Device Location"
                    : "Capture Device Location"}
              </button>
              <p className="ops-subtle">
                {capturedPosition
                  ? `Attached ${capturedPosition.latitude}, ${capturedPosition.longitude}`
                  : hasGeolocationSupport
                    ? "Recommended for field traceability."
                    : "Geolocation is not available on this device."}
              </p>
            </div>

            <div className="ops-actions">
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={submitValidation}
                disabled={volumeLiters.trim().length === 0 || validateStopMutation.isPending}
              >
                {validateStopMutation.isPending ? "Validating..." : "Validate Stop"}
              </button>
            </div>
          </>
        ) : (
          <p className="ops-empty">No active stop is waiting for validation.</p>
        )}
      </article>

      <article className="ops-card ops-form">
        <div className="ops-card-head">
          <div>
            <h2>Report Anomaly</h2>
            <p className="ops-card-intro">
              Send blocked, damaged, or unsafe conditions to the manager queue without leaving the tour.
            </p>
          </div>
          <span className="ops-chip ops-chip-danger">Manager alert</span>
        </div>

        <div className="ops-grid ops-grid-2">
          <div className="ops-field">
            <label htmlFor="agent-tour-anomaly-type" className="ops-label">
              Anomaly type
            </label>
            <select
              id="agent-tour-anomaly-type"
              className="ops-select"
              value={anomalyTypeId}
              onChange={(event) => setAnomalyTypeId(event.target.value)}
            >
              <option value="">Select anomaly type</option>
              {anomalyTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ops-field">
            <label htmlFor="agent-tour-anomaly-severity" className="ops-label">
              Severity
            </label>
            <select
              id="agent-tour-anomaly-severity"
              className="ops-select"
              value={anomalySeverity}
              onChange={(event) => setAnomalySeverity(event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="ops-field">
          <label htmlFor="agent-tour-anomaly-comments" className="ops-label">
            Comments
          </label>
          <textarea
            id="agent-tour-anomaly-comments"
            className="ops-textarea"
            rows={3}
            value={anomalyComments}
            onChange={(event) => setAnomalyComments(event.target.value)}
            placeholder="Describe what is blocking or endangering the stop."
          />
        </div>

        <div className="ops-field">
          <label htmlFor="agent-tour-anomaly-photo-url" className="ops-label">
            Photo URL (optional)
          </label>
          <input
            id="agent-tour-anomaly-photo-url"
            className="ops-input"
            value={anomalyPhotoUrl}
            onChange={(event) => setAnomalyPhotoUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-danger"
            disabled={!anomalyTypeId || reportAnomalyMutation.isPending}
            onClick={submitAnomaly}
          >
            {reportAnomalyMutation.isPending ? "Reporting..." : "Report Anomaly"}
          </button>
        </div>
      </article>

      <article className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Tour Activity History</h2>
            <p className="ops-card-intro">
              Use the timeline to confirm dispatch-visible events without leaving the route.
            </p>
          </div>
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={() => activityQuery.refetch()}
            disabled={activityQuery.isFetching || !tour?.id}
          >
            {activityQuery.isFetching ? "Refreshing..." : "Refresh Activity"}
          </button>
        </div>

        <ul className="ops-list ops-mt-sm">
          {activityRows.length === 0 ? (
            <li className="ops-empty">No activity has been captured for this tour yet.</li>
          ) : (
            activityRows.map((item) => {
              const activity = describeActivity(item);

              return (
                <li key={item.id} className="ops-list-item">
                  <div className="ops-stop-head">
                    <p>
                      <strong>{activity.title}</strong>
                    </p>
                    <p className="ops-list-meta">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <p className="ops-list-meta">{activity.summary}</p>
                  {item.actorDisplayName ? (
                    <p className="ops-list-meta">Actor: {item.actorDisplayName}</p>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </article>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : statusTone === "info"
                ? "ops-status ops-status-info"
                : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
