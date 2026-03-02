import { useMemo, useState } from "react";
import {
  useCreatePlannedTour,
  useOptimizeTourPlan,
  usePlanningAgents,
  usePlanningZones,
} from "../hooks/usePlanning";
import "../styles/OperationsPages.css";

type Zone = { id: string; name: string };
type Agent = { id: string; displayName?: string | null; email: string };
type RoutePoint = {
  id: string;
  code: string;
  label: string;
  fillLevelPercent: number;
  order: number;
};

const toLocalDateTimeInputValue = (date: Date) => {
  const offsetInMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetInMilliseconds).toISOString().slice(0, 16);
};

const toScheduledIsoString = (value: string) => {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallbackMessage;

export default function ManagerPlanningPage() {
  const [name, setName] = useState("Daily Optimized Tour");
  const [zoneId, setZoneId] = useState("");
  const [scheduledFor, setScheduledFor] = useState(() =>
    toLocalDateTimeInputValue(new Date()),
  );
  const [fillThresholdPercent, setFillThresholdPercent] = useState(70);
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [orderedRoute, setOrderedRoute] = useState<RoutePoint[]>([]);
  const [planCreated, setPlanCreated] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">(
    "success",
  );

  const zonesQuery = usePlanningZones();
  const agentsQuery = usePlanningAgents();
  const optimizeMutation = useOptimizeTourPlan();
  const createMutation = useCreatePlannedTour();

  const zones = ((zonesQuery.data as { zones?: Zone[] } | undefined)?.zones ?? []);
  const agents = ((agentsQuery.data as { agents?: Agent[] } | undefined)?.agents ?? []);

  const optimizationMetrics = useMemo(() => {
    return (
      (optimizeMutation.data as {
        metrics?: { totalDistanceKm?: number; estimatedDurationMinutes?: number };
      } | undefined)?.metrics
    );
  }, [optimizeMutation.data]);

  const scheduledForIsoString = toScheduledIsoString(scheduledFor);
  const zonePlaceholderLabel = zonesQuery.isLoading
    ? "Loading zones..."
    : zonesQuery.isError
      ? "Unable to load zones"
      : "Select zone";
  const agentPlaceholderLabel = agentsQuery.isLoading
    ? "Loading agents..."
    : agentsQuery.isError
      ? "Unable to load agents"
      : "Unassigned";

  const resetOptimizationState = () => {
    setOrderedRoute([]);
    setPlanCreated(false);
    optimizeMutation.reset?.();
  };

  const clearStatus = () => {
    setStatusMessage("");
  };

  const optimizeRoute = async () => {
    if (!zoneId) {
      setStatusTone("error");
      setStatusMessage("Select a zone before optimizing.");
      return;
    }

    if (!scheduledForIsoString) {
      setStatusTone("error");
      setStatusMessage("Enter a valid schedule before optimizing.");
      return;
    }

    clearStatus();
    setPlanCreated(false);

    try {
      const response = (await optimizeMutation.mutateAsync({
        zoneId,
        scheduledFor: scheduledForIsoString,
        fillThresholdPercent,
      })) as {
        route?: RoutePoint[];
        metrics?: { deferredForNearbyTours?: number };
      };

      const nextRoute = Array.isArray(response.route) ? response.route : [];
      const deferredForNearbyTours = response.metrics?.deferredForNearbyTours ?? 0;
      setOrderedRoute(nextRoute);

      if (nextRoute.length === 0) {
        setStatusTone("info");
        setStatusMessage(
          deferredForNearbyTours > 0
            ? "All matching containers are already planned on nearby tours for this schedule. Pick another time or adjust the threshold."
            : "No containers match this zone and fill threshold yet.",
        );
        return;
      }

      setStatusTone("success");
      setStatusMessage(
        deferredForNearbyTours > 0
          ? `Route generated. ${deferredForNearbyTours} matching container${
              deferredForNearbyTours === 1 ? " was" : "s were"
            } skipped because ${
              deferredForNearbyTours === 1 ? "it is" : "they are"
            } already planned on nearby tours.`
          : "Route generated. Review the stop order, then create the tour.",
      );
    } catch (error) {
      setOrderedRoute([]);
      setStatusTone("error");
      setStatusMessage(getErrorMessage(error, "Failed to optimize the route."));
    }
  };

  const moveRouteItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedRoute.length) {
      return;
    }

    clearStatus();
    setPlanCreated(false);
    setOrderedRoute((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next.map((entry, orderIndex) => ({ ...entry, order: orderIndex + 1 }));
    });
  };

  const submitTour = async () => {
    if (orderedRoute.length === 0 || !zoneId) {
      setStatusTone("error");
      setStatusMessage("Optimize route first before creating tour.");
      return;
    }

    if (name.trim().length === 0) {
      setStatusTone("error");
      setStatusMessage("Enter a tour name before creating the tour.");
      return;
    }

    if (!scheduledForIsoString) {
      setStatusTone("error");
      setStatusMessage("Enter a valid schedule before creating the tour.");
      return;
    }

    clearStatus();

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        zoneId,
        scheduledFor: scheduledForIsoString,
        assignedAgentId: assignedAgentId || undefined,
        orderedContainerIds: orderedRoute.map((item) => item.id),
      });

      setPlanCreated(true);
      setStatusTone("success");
      setStatusMessage(
        assignedAgentId
          ? "Planned tour created and assigned successfully."
          : "Planned tour created successfully.",
      );
    } catch (error) {
      setPlanCreated(false);
      setStatusTone("error");
      setStatusMessage(
        getErrorMessage(error, "Failed to create planned tour."),
      );
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Tour Planning Wizard</h1>
        <p>
          Configure zone, threshold, and schedule to prepare a route plan, then
          optionally assign an agent before creating the tour.
        </p>
      </header>

      <article className="ops-card ops-form">
        <div className="ops-grid ops-grid-2 sm:grid-cols-2">
          <div className="ops-field">
            <label htmlFor="manager-planning-tour-name" className="ops-label">
              Tour name
            </label>
            <input
              id="manager-planning-tour-name"
              className="ops-input"
              value={name}
              onChange={(event) => {
                clearStatus();
                setPlanCreated(false);
                setName(event.target.value);
              }}
            />
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-scheduled-for" className="ops-label">
              Scheduled date/time
            </label>
            <input
              id="manager-planning-scheduled-for"
              type="datetime-local"
              className="ops-input"
              aria-describedby="manager-planning-scheduled-for-help"
              value={scheduledFor}
              onChange={(event) => {
                clearStatus();
                setScheduledFor(event.target.value);
                resetOptimizationState();
              }}
            />
            <p id="manager-planning-scheduled-for-help" className="ops-subtle">
              Uses your local time and also avoids containers already reserved on
              nearby tours for the selected schedule.
            </p>
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-zone" className="ops-label">
              Zone
            </label>
            <select
              id="manager-planning-zone"
              className="ops-select"
              value={zoneId}
              disabled={zonesQuery.isLoading || zonesQuery.isError}
              onChange={(event) => {
                clearStatus();
                setZoneId(event.target.value);
                resetOptimizationState();
              }}
            >
              <option value="">{zonePlaceholderLabel}</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {zonesQuery.isError ? (
              <p className="ops-subtle" role="status" aria-live="polite">
                Zone data could not be loaded. Refresh the page and try again.
              </p>
            ) : null}
            {!zonesQuery.isLoading && !zonesQuery.isError && zones.length === 0 ? (
              <p className="ops-subtle">No zones are available yet.</p>
            ) : null}
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-fill-threshold" className="ops-label">
              Fill threshold (%)
            </label>
            <input
              id="manager-planning-fill-threshold"
              type="number"
              min={0}
              max={100}
              className="ops-input"
              value={fillThresholdPercent}
              onChange={(event) => {
                clearStatus();
                setFillThresholdPercent(Number(event.target.value) || 0);
                resetOptimizationState();
              }}
            />
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-assigned-agent" className="ops-label">
              Assign agent
            </label>
            <select
              id="manager-planning-assigned-agent"
              className="ops-select"
              value={assignedAgentId}
              disabled={agentsQuery.isLoading}
              onChange={(event) => {
                clearStatus();
                setPlanCreated(false);
                setAssignedAgentId(event.target.value);
              }}
            >
              <option value="">{agentPlaceholderLabel}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.email}
                </option>
              ))}
            </select>
            {agentsQuery.isError ? (
              <p className="ops-subtle" role="status" aria-live="polite">
                Agent data could not be loaded. You can still create the tour
                without assigning anyone yet.
              </p>
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.length === 0 ? (
              <p className="ops-subtle">
                No active agents are available right now. The tour can stay
                unassigned.
              </p>
            ) : null}
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            onClick={optimizeRoute}
            disabled={
              optimizeMutation.isPending || zonesQuery.isLoading || zonesQuery.isError
            }
          >
            {optimizeMutation.isPending ? "Optimizing..." : "Run Optimization"}
          </button>

          <button
            type="button"
            className="ops-btn ops-btn-success"
            onClick={submitTour}
            disabled={
              createMutation.isPending || orderedRoute.length === 0 || planCreated
            }
          >
            {createMutation.isPending
              ? "Creating..."
              : planCreated
                ? "Tour Created"
                : "Create Planned Tour"}
          </button>
        </div>
      </article>

      <article className="ops-card">
        <h2>Optimized Route</h2>
        {optimizationMetrics ? (
          <p className="ops-card-intro">
            Estimated distance: {optimizationMetrics.totalDistanceKm ?? 0} km -
            Estimated duration: {optimizationMetrics.estimatedDurationMinutes ?? 0} min
          </p>
        ) : null}

        {orderedRoute.length === 0 ? (
          <p className="ops-empty ops-mt-sm">
            Run optimization to generate candidate route order.
          </p>
        ) : (
          <ul className="ops-list ops-mt-sm">
            {orderedRoute.map((item, index) => (
              <li key={item.id} className="ops-list-item">
                <p>
                  <strong>#{index + 1}</strong> - {item.code} - {item.label}
                </p>
                <p className="ops-list-meta">Fill level: {item.fillLevelPercent}%</p>

                <div className="ops-actions ops-mt-xs">
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => moveRouteItem(index, -1)}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => moveRouteItem(index, 1)}
                    disabled={index === orderedRoute.length - 1}
                  >
                    Down
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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
