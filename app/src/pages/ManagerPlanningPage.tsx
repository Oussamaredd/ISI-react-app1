import { useMemo } from "react";
import {
  useCreatePlannedTour,
  useOptimizeTourPlan,
  usePlanningAgents,
  usePlanningZones,
  useRebuildTourRoute,
} from "../hooks/usePlanning";
import { usePlanningDraftState } from "../state/PlanningDraftContext";
import type { RoutePoint } from "../state/planningDraft";
import "../styles/OperationsPages.css";

type Zone = { id: string; name: string };
type Agent = {
  id: string;
  displayName?: string | null;
  email: string;
  zoneId?: string | null;
  zoneName?: string | null;
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

const formatOptimizationAlgorithm = (algorithm: string) => {
  switch (algorithm) {
    case "nearest_neighbor":
      return "nearest-neighbor";
    case "two_opt":
      return "2-opt";
    default:
      return algorithm;
  }
};

export default function ManagerPlanningPage() {
  const {
    draft,
    setName,
    setZoneId,
    setScheduledFor,
    setFillThresholdPercent,
    setAssignedAgentId,
    setOrderedRoute,
    moveRouteItem,
    setCreatedTourId,
    setPlanCreated,
    setStatus,
    clearStatus,
    resetOptimization,
    setOptimizationMetrics,
  } = usePlanningDraftState();
  const zonesQuery = usePlanningZones();
  const agentsQuery = usePlanningAgents();
  const optimizeMutation = useOptimizeTourPlan();
  const createMutation = useCreatePlannedTour();
  const rebuildRouteMutation = useRebuildTourRoute();

  const zones = ((zonesQuery.data as { zones?: Zone[] } | undefined)?.zones ?? []);
  const agents = ((agentsQuery.data as { agents?: Agent[] } | undefined)?.agents ?? []);
  const selectedZoneName = zones.find((zone) => zone.id === draft.zoneId)?.name ?? null;
  const availableAgents = useMemo(
    () => agents.filter((agent) => agent.zoneId === draft.zoneId),
    [agents, draft.zoneId],
  );

  const optimizationMetrics = useMemo(
    () =>
      draft.optimizationMetrics ??
      ((optimizeMutation.data as {
        metrics?: {
          totalDistanceKm?: number;
          estimatedDurationMinutes?: number;
          selectedContainerCount?: number;
          maxContainerCount?: number;
          algorithmsApplied?: string[];
          optimizationTimedOut?: boolean;
        };
      } | undefined)?.metrics ?? null),
    [draft.optimizationMetrics, optimizeMutation.data],
  );
  const optimizationAlgorithmsLabel =
    optimizationMetrics?.algorithmsApplied
      ?.map((algorithm) => formatOptimizationAlgorithm(algorithm))
      .join(" + ") ?? null;

  const scheduledForIsoString = toScheduledIsoString(draft.scheduledFor);
  const zonePlaceholderLabel = zonesQuery.isLoading
    ? "Loading zones..."
    : zonesQuery.isError
      ? "Unable to load zones"
      : "Select zone";
  const agentPlaceholderLabel = !draft.zoneId
    ? "Select zone first"
    : agentsQuery.isLoading
      ? "Loading agents..."
      : agentsQuery.isError
        ? "Unable to load agents"
        : availableAgents.length === 0
          ? "No agents in selected zone"
          : "Unassigned";

  const resetOptimizationState = () => {
    resetOptimization();
    optimizeMutation.reset?.();
  };

  const optimizeRoute = async () => {
    if (!draft.zoneId) {
      setStatus("Select a zone before optimizing.", "error");
      return;
    }

    if (!scheduledForIsoString) {
      setStatus("Enter a valid schedule before optimizing.", "error");
      return;
    }

    clearStatus();
    setPlanCreated(false);
    setCreatedTourId(null);

    try {
      const response = (await optimizeMutation.mutateAsync({
        zoneId: draft.zoneId,
        scheduledFor: scheduledForIsoString,
        fillThresholdPercent: draft.fillThresholdPercent,
      })) as {
        route?: RoutePoint[];
        metrics?: {
          totalDistanceKm?: number;
          estimatedDurationMinutes?: number;
          deferredForNearbyTours?: number;
          selectedContainerCount?: number;
          maxContainerCount?: number;
          algorithmsApplied?: string[];
          optimizationTimedOut?: boolean;
        };
      };

      const nextRoute = Array.isArray(response.route) ? response.route : [];
      const deferredForNearbyTours = response.metrics?.deferredForNearbyTours ?? 0;
      const optimizationTimedOut = response.metrics?.optimizationTimedOut ?? false;
      setOrderedRoute(nextRoute);
      setOptimizationMetrics({
        totalDistanceKm: response.metrics?.totalDistanceKm,
        estimatedDurationMinutes: response.metrics?.estimatedDurationMinutes,
        selectedContainerCount: response.metrics?.selectedContainerCount,
        maxContainerCount: response.metrics?.maxContainerCount,
        algorithmsApplied: response.metrics?.algorithmsApplied,
        optimizationTimedOut,
      });

      if (nextRoute.length === 0) {
        setStatus(
          deferredForNearbyTours > 0
            ? "All matching containers are already planned on nearby tours for this schedule. Pick another time or adjust the threshold."
            : "No containers match this zone and fill threshold yet.",
          "info",
        );
        return;
      }

      setStatus(
        `${
          deferredForNearbyTours > 0
            ? `Route generated. ${deferredForNearbyTours} matching container${
                deferredForNearbyTours === 1 ? " was" : "s were"
              } skipped because ${
                deferredForNearbyTours === 1 ? "it is" : "they are"
              } already planned on nearby tours.`
            : "Route generated. Review the stop order, then create the tour."
        }${optimizationTimedOut ? " The 2-opt pass stopped when the planning time budget elapsed." : ""}`,
        "success",
      );
    } catch (error) {
      setOrderedRoute([]);
      setOptimizationMetrics(null);
      setStatus(getErrorMessage(error, "Failed to optimize the route."), "error");
    }
  };

  const submitTour = async () => {
    if (draft.orderedRoute.length === 0 || !draft.zoneId) {
      setStatus("Optimize route first before creating tour.", "error");
      return;
    }

    if (draft.name.trim().length === 0) {
      setStatus("Enter a tour name before creating the tour.", "error");
      return;
    }

    if (!scheduledForIsoString) {
      setStatus("Enter a valid schedule before creating the tour.", "error");
      return;
    }

    if (
      draft.assignedAgentId &&
      !availableAgents.some((agent) => agent.id === draft.assignedAgentId)
    ) {
      setStatus("Select an agent who belongs to the selected zone before creating the tour.", "error");
      return;
    }

    clearStatus();

    try {
      const createdTour = (await createMutation.mutateAsync({
        name: draft.name.trim(),
        zoneId: draft.zoneId,
        scheduledFor: scheduledForIsoString,
        assignedAgentId: draft.assignedAgentId || undefined,
        orderedContainerIds: draft.orderedRoute.map((item) => item.id),
      })) as { id?: string };

      setPlanCreated(true);
      setCreatedTourId(typeof createdTour?.id === "string" ? createdTour.id : null);
      setStatus(
        draft.assignedAgentId
          ? "Planned tour created and assigned successfully."
          : "Planned tour created successfully.",
        "success",
      );
    } catch (error) {
      setPlanCreated(false);
      setStatus(getErrorMessage(error, "Failed to create planned tour."), "error");
    }
  };

  const rebuildStoredRoute = async () => {
    if (!draft.lastCreatedTourId) {
      setStatus("Create a tour first before rebuilding its stored route.", "error");
      return;
    }

    clearStatus();

    try {
      const response = (await rebuildRouteMutation.mutateAsync(draft.lastCreatedTourId)) as {
        routeGeometry?: { source?: string };
      };
      const routeSource = response.routeGeometry?.source === "live" ? "road route" : "fallback route";

      setStatus(
        `Stored route rebuilt successfully. Latest persisted result is a ${routeSource}.`,
        "success",
      );
    } catch (error) {
      setStatus(getErrorMessage(error, "Failed to rebuild the stored route."), "error");
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Tour Planning Wizard</h1>
        <p>
          Use the primary manager desktop planner to turn citizen-driven demand and supporting
          context into a route plan. The planning service applies nearest-neighbor plus 2-opt
          from the selected zone depot, then tour creation persists the resulting route.
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
              value={draft.name}
              onChange={(event) => {
                clearStatus();
                optimizeMutation.reset?.();
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
              value={draft.scheduledFor}
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
              value={draft.zoneId}
              disabled={zonesQuery.isLoading || zonesQuery.isError}
              onChange={(event) => {
                clearStatus();
                setAssignedAgentId("");
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
              value={draft.fillThresholdPercent}
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
              value={draft.assignedAgentId}
              disabled={agentsQuery.isLoading || !draft.zoneId}
              onChange={(event) => {
                clearStatus();
                setAssignedAgentId(event.target.value);
              }}
            >
              <option value="">{agentPlaceholderLabel}</option>
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.email}
                </option>
              ))}
            </select>
            {!draft.zoneId ? (
              <p className="ops-subtle">Select a zone first to see assignable agents.</p>
            ) : null}
            {agentsQuery.isError ? (
              <p className="ops-subtle" role="status" aria-live="polite">
                Agent data could not be loaded. You can still create the tour
                without assigning anyone yet.
              </p>
            ) : null}
            {!agentsQuery.isLoading &&
            !agentsQuery.isError &&
            draft.zoneId &&
            availableAgents.length === 0 ? (
              <p className="ops-subtle">
                No active agents are assigned to {selectedZoneName ?? "this zone"} right now.
                The tour can stay unassigned.
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
              createMutation.isPending || draft.orderedRoute.length === 0 || draft.planCreated
            }
          >
            {createMutation.isPending
              ? "Creating..."
              : draft.planCreated
                ? "Tour Created"
                : "Create Planned Tour"}
          </button>

          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={rebuildStoredRoute}
            disabled={!draft.lastCreatedTourId || rebuildRouteMutation.isPending}
          >
            {rebuildRouteMutation.isPending ? "Rebuilding..." : "Rebuild Stored Route"}
          </button>
        </div>

        {draft.lastCreatedTourId ? (
          <p className="ops-subtle">
            Last created tour: {draft.lastCreatedTourId}. Use the rebuild action to refresh the persisted route
            without editing the stops.
          </p>
        ) : null}
      </article>

      <article className="ops-card">
        <h2>Optimized Route</h2>
        {optimizationMetrics ? (
          <>
            <p className="ops-card-intro">
              Estimated distance: {optimizationMetrics.totalDistanceKm ?? 0} km -
              Estimated duration: {optimizationMetrics.estimatedDurationMinutes ?? 0} min
            </p>
            <p className="ops-subtle">
              Stops selected: {optimizationMetrics.selectedContainerCount ?? draft.orderedRoute.length}
              {optimizationMetrics.maxContainerCount
                ? ` / ${optimizationMetrics.maxContainerCount}`
                : ""}
              {optimizationAlgorithmsLabel ? ` - Algorithms: ${optimizationAlgorithmsLabel}` : ""}
            </p>
            {optimizationMetrics.optimizationTimedOut ? (
              <p className="ops-subtle">
                The 2-opt pass stopped at the planning time budget. Review the stop order before
                creating the tour.
              </p>
            ) : null}
          </>
        ) : null}

        {draft.orderedRoute.length === 0 ? (
          <p className="ops-empty ops-mt-sm">
            Run optimization to generate candidate route order.
          </p>
        ) : (
          <ul className="ops-list ops-mt-sm">
            {draft.orderedRoute.map((item, index) => (
              <li key={item.id} className="ops-list-item">
                <p>
                  <strong>#{index + 1}</strong> - {item.code} - {item.label}
                </p>
                <p className="ops-list-meta">Fill level: {item.fillLevelPercent}%</p>

                <div className="ops-actions ops-mt-xs">
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => {
                      clearStatus();
                      moveRouteItem(index, -1);
                    }}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn-outline"
                    onClick={() => {
                      clearStatus();
                      moveRouteItem(index, 1);
                    }}
                    disabled={index === draft.orderedRoute.length - 1}
                  >
                    Down
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {draft.statusMessage ? (
        <p
          className={
            draft.statusTone === "success"
              ? "ops-status ops-status-success"
              : draft.statusTone === "info"
                ? "ops-status ops-status-info"
                : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {draft.statusMessage}
        </p>
      ) : null}
    </section>
  );
}
