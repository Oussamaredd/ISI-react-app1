import { useMemo, useState } from "react";
import {
  useAgentTour,
  useAnomalyTypes,
  useReportAnomaly,
  useStartAgentTour,
  useTourActivity,
  useValidateTourStop,
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

export default function AgentTourPage() {
  const [qrCode, setQrCode] = useState("");
  const [manualContainerId, setManualContainerId] = useState("");
  const [volumeLiters, setVolumeLiters] = useState("");
  const [validationNotes, setValidationNotes] = useState("");
  const [anomalyTypeId, setAnomalyTypeId] = useState("");
  const [anomalyComments, setAnomalyComments] = useState("");
  const [anomalyPhotoUrl, setAnomalyPhotoUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

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
        zoneName?: string | null;
        scheduledFor?: string;
        stops?: TourStop[];
        itinerary?: Array<{
          stopId: string;
          order: number;
          latitude?: string | null;
          longitude?: string | null;
        }>;
      }
    | null;

  const stops = Array.isArray(tour?.stops) ? tour.stops : [];
  const activeStop = useMemo(
    () =>
      stops.find((stop) => stop.status === "active") ??
      stops.find((stop) => stop.status === "pending") ??
      null,
    [stops],
  );

  const activityQuery = useTourActivity(tour?.id);
  const activityRows =
    ((activityQuery.data as {
      activity?: Array<{ id: string; type: string; createdAt: string; details: unknown }>;
    } | undefined)?.activity ?? []);

  const itineraryCoordinates = useMemo(() => {
    const coordinates = (tour?.itinerary ?? [])
      .map((point) => {
        const lat = Number(point.latitude);
        const lng = Number(point.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return { lat, lng, order: point.order };
      })
      .filter((value): value is { lat: number; lng: number; order: number } => value != null);

    if (coordinates.length === 0) {
      return [];
    }

    const minLat = Math.min(...coordinates.map((item) => item.lat));
    const maxLat = Math.max(...coordinates.map((item) => item.lat));
    const minLng = Math.min(...coordinates.map((item) => item.lng));
    const maxLng = Math.max(...coordinates.map((item) => item.lng));

    return coordinates.map((item) => ({
      order: item.order,
      x: maxLng === minLng ? 50 : 10 + ((item.lng - minLng) / (maxLng - minLng)) * 80,
      y: maxLat === minLat ? 50 : 90 - ((item.lat - minLat) / (maxLat - minLat)) * 80,
    }));
  }, [tour?.itinerary]);

  const submitValidation = async () => {
    if (!tour || !activeStop) {
      return;
    }

    setStatusMessage("");

    try {
      const payload = {
        tourId: tour.id,
        stopId: activeStop.id,
        volumeLiters: Number(volumeLiters),
        qrCode: qrCode || undefined,
        containerId: manualContainerId || undefined,
        notes: validationNotes || undefined,
      };

      const response = (await validateStopMutation.mutateAsync(payload)) as {
        nextStopId?: string | null;
      };

      setStatusTone("success");
      setStatusMessage(
        response.nextStopId
          ? `Collection validated. Auto-advanced to next stop (${response.nextStopId}).`
          : "Collection validated. Tour completed.",
      );
      setQrCode("");
      setManualContainerId("");
      setVolumeLiters("");
      setValidationNotes("");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to validate collection stop.",
      );
    }
  };

  const submitAnomaly = async () => {
    if (!tour || !anomalyTypeId) {
      return;
    }

    setStatusMessage("");

    try {
      const response = (await reportAnomalyMutation.mutateAsync({
        tourId: tour.id,
        anomalyTypeId,
        tourStopId: activeStop?.id,
        comments: anomalyComments || undefined,
        photoUrl: anomalyPhotoUrl || undefined,
        severity: "medium",
      })) as { managerAlertTriggered?: boolean };

      setStatusTone("success");
      setStatusMessage(
        response.managerAlertTriggered
          ? "Anomaly reported and manager alert triggered."
          : "Anomaly reported.",
      );
      setAnomalyComments("");
      setAnomalyPhotoUrl("");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to report anomaly.",
      );
    }
  };

  if (agentTourQuery.isLoading) {
    return (
      <section className="ops-page">
        <p className="ops-status ops-status-success">Loading assigned tour...</p>
      </section>
    );
  }

  if (!tour) {
    return (
      <section className="ops-page">
        <header className="ops-hero">
          <h1>Daily Agent Tour</h1>
          <p>No assigned tour is available for your account yet.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>{tour.name}</h1>
        <p>
          Zone: {tour.zoneName ?? "Unassigned"} - Scheduled{" "}
          {tour.scheduledFor ? new Date(tour.scheduledFor).toLocaleString() : "N/A"}
        </p>
        <div className="ops-actions ops-mt-lg">
          <span className="ops-chip ops-chip-info">Status: {tour.status}</span>
          <button
            type="button"
            className="ops-btn ops-btn-success"
            disabled={tour.status === "in_progress" || startTourMutation.isPending}
            onClick={() => startTourMutation.mutate(tour.id)}
          >
            {tour.status === "in_progress" ? "Tour In Progress" : "Start Tour"}
          </button>
        </div>
      </header>

      <article className="ops-card">
        <h2>Itinerary Map</h2>
        {itineraryCoordinates.length === 0 ? (
          <p className="ops-empty ops-mt-xs">
            No coordinate data available for map rendering.
          </p>
        ) : (
          <div className="ops-map-frame">
            <svg viewBox="0 0 100 100" className="w-full">
              <polyline
                points={itineraryCoordinates.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#4f8cff"
                strokeWidth="2"
              />
              {itineraryCoordinates.map((point) => (
                <g key={point.order}>
                  <circle cx={point.x} cy={point.y} r="3" fill="#27d17f" />
                  <text x={point.x + 2} y={point.y - 2} fontSize="4" fill="#f3f7ff">
                    {point.order}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </article>

      <article className="ops-card">
        <h2>Ordered Stops</h2>
        <ul className="ops-list ops-mt-lg">
          {stops.map((stop) => {
            const toneClass =
              stop.status === "active"
                ? "ops-chip ops-chip-success"
                : stop.status === "completed"
                  ? "ops-chip ops-chip-info"
                  : "ops-chip ops-chip-warning";

            return (
              <li key={stop.id} className="ops-list-item">
                <p>
                  <strong>#{stop.stopOrder}</strong> - {stop.containerCode} - {stop.containerLabel}
                </p>
                <p className="ops-list-meta">
                  ETA: {stop.eta ? new Date(stop.eta).toLocaleTimeString() : "N/A"}
                </p>
                <div className="ops-actions ops-mt-xs">
                  <span className={toneClass}>Status: {stop.status}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="ops-card ops-form">
        <h2>Validate Active Stop</h2>
        {activeStop ? (
          <>
            <p className="ops-subtle">
              Active stop: #{activeStop.stopOrder} - {activeStop.containerCode}
            </p>

            <div className="ops-field">
              <label htmlFor="agent-tour-volume-liters" className="ops-label">
                Volume (liters)
              </label>
              <input
                id="agent-tour-volume-liters"
                className="ops-input"
                type="number"
                value={volumeLiters}
                onChange={(event) => setVolumeLiters(event.target.value)}
                placeholder="e.g. 120"
              />
            </div>

            <div className="ops-field">
              <label htmlFor="agent-tour-qr-code" className="ops-label">
                QR code (optional)
              </label>
              <input
                id="agent-tour-qr-code"
                className="ops-input"
                value={qrCode}
                onChange={(event) => setQrCode(event.target.value)}
                placeholder="Scan or type QR value"
              />
            </div>

            <div className="ops-field">
              <label htmlFor="agent-tour-manual-container" className="ops-label">
                Manual fallback container
              </label>
              <select
                id="agent-tour-manual-container"
                className="ops-select"
                value={manualContainerId}
                onChange={(event) => setManualContainerId(event.target.value)}
              >
                <option value="">Use stop default container</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.containerId}>
                    {stop.containerCode} - {stop.containerLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="ops-field">
              <label htmlFor="agent-tour-validation-notes" className="ops-label">
                Notes (optional)
              </label>
              <textarea
                id="agent-tour-validation-notes"
                className="ops-textarea"
                rows={2}
                value={validationNotes}
                onChange={(event) => setValidationNotes(event.target.value)}
              />
            </div>

            <div className="ops-actions">
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={submitValidation}
                disabled={!volumeLiters || validateStopMutation.isPending}
              >
                {validateStopMutation.isPending ? "Validating..." : "Validate Stop"}
              </button>
            </div>
          </>
        ) : (
          <p className="ops-empty">No active stop pending validation.</p>
        )}
      </article>

      <article className="ops-card ops-form">
        <h2>Report Anomaly</h2>

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
            {((anomalyTypesQuery.data as {
              anomalyTypes?: Array<{ id: string; label: string }>;
            } | undefined)?.anomalyTypes ?? []
            ).map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ops-field">
          <label htmlFor="agent-tour-anomaly-comments" className="ops-label">
            Comments
          </label>
          <textarea
            id="agent-tour-anomaly-comments"
            className="ops-textarea"
            rows={2}
            value={anomalyComments}
            onChange={(event) => setAnomalyComments(event.target.value)}
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
        <h2>Tour Activity History</h2>
        <ul className="ops-list ops-mt-sm">
          {activityRows.length === 0 ? (
            <li className="ops-empty">No activity captured yet.</li>
          ) : (
            activityRows.map((item) => (
              <li key={item.id} className="ops-list-item">
                <p>
                  <strong>{item.type}</strong>
                </p>
                <p className="ops-list-meta">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </article>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
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
