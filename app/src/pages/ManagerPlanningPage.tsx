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

export default function ManagerPlanningPage() {
  const [name, setName] = useState("Daily Optimized Tour");
  const [zoneId, setZoneId] = useState("");
  const [scheduledFor, setScheduledFor] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [fillThresholdPercent, setFillThresholdPercent] = useState(70);
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [orderedRoute, setOrderedRoute] = useState<RoutePoint[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");

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

  const optimizeRoute = async () => {
    if (!zoneId || !scheduledFor) {
      setStatusTone("error");
      setStatusMessage("Select zone and schedule before optimizing.");
      return;
    }

    setStatusMessage("");
    const response = (await optimizeMutation.mutateAsync({
      zoneId,
      scheduledFor: new Date(scheduledFor).toISOString(),
      fillThresholdPercent,
    })) as { route?: RoutePoint[] };

    setOrderedRoute(Array.isArray(response.route) ? response.route : []);
  };

  const moveRouteItem = (index: number, direction: -1 | 1) => {
    setOrderedRoute((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

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

    setStatusMessage("");

    try {
      await createMutation.mutateAsync({
        name,
        zoneId,
        scheduledFor: new Date(scheduledFor).toISOString(),
        assignedAgentId: assignedAgentId || undefined,
        orderedContainerIds: orderedRoute.map((item) => item.id),
      });

      setStatusTone("success");
      setStatusMessage("Planned tour created and assigned successfully.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to create planned tour.",
      );
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Tour Planning Wizard</h1>
        <p>
          Configure zone, threshold, and schedule to generate a clean route plan
          and assign the best available agent.
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
              onChange={(event) => setName(event.target.value)}
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
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
            />
          </div>

          <div className="ops-field">
            <label htmlFor="manager-planning-zone" className="ops-label">
              Zone
            </label>
            <select
              id="manager-planning-zone"
              className="ops-select"
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
            >
              <option value="">Select zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
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
              onChange={(event) => setFillThresholdPercent(Number(event.target.value))}
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
              onChange={(event) => setAssignedAgentId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            onClick={optimizeRoute}
            disabled={optimizeMutation.isPending}
          >
            {optimizeMutation.isPending ? "Optimizing..." : "Run Optimization"}
          </button>

          <button
            type="button"
            className="ops-btn ops-btn-success"
            onClick={submitTour}
            disabled={createMutation.isPending || orderedRoute.length === 0}
          >
            {createMutation.isPending ? "Creating..." : "Create Planned Tour"}
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
