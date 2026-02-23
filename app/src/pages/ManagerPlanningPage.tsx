import { useMemo, useState } from 'react';

import {
  useCreatePlannedTour,
  useOptimizeTourPlan,
  usePlanningAgents,
  usePlanningZones,
} from '../hooks/usePlanning';

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
  const [name, setName] = useState('Daily Optimized Tour');
  const [zoneId, setZoneId] = useState('');
  const [scheduledFor, setScheduledFor] = useState(() => new Date().toISOString().slice(0, 16));
  const [fillThresholdPercent, setFillThresholdPercent] = useState(70);
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [orderedRoute, setOrderedRoute] = useState<RoutePoint[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  const zonesQuery = usePlanningZones();
  const agentsQuery = usePlanningAgents();
  const optimizeMutation = useOptimizeTourPlan();
  const createMutation = useCreatePlannedTour();

  const zones = ((zonesQuery.data as { zones?: Zone[] } | undefined)?.zones ?? []);
  const agents = ((agentsQuery.data as { agents?: Agent[] } | undefined)?.agents ?? []);

  const optimizationMetrics = useMemo(() => {
    return (optimizeMutation.data as { metrics?: { totalDistanceKm?: number; estimatedDurationMinutes?: number } } | undefined)
      ?.metrics;
  }, [optimizeMutation.data]);

  const optimizeRoute = async () => {
    if (!zoneId || !scheduledFor) {
      setStatusMessage('Select zone and schedule before optimizing.');
      return;
    }

    setStatusMessage('');
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
      setStatusMessage('Optimize route first before creating tour.');
      return;
    }

    setStatusMessage('');

    try {
      await createMutation.mutateAsync({
        name,
        zoneId,
        scheduledFor: new Date(scheduledFor).toISOString(),
        assignedAgentId: assignedAgentId || undefined,
        orderedContainerIds: orderedRoute.map((item) => item.id),
      });

      setStatusMessage('Planned tour created and assigned successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create planned tour.');
    }
  };

  return (
    <section className="p-4 sm:p-6 space-y-4">
      <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Tour Planning Wizard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure zone, threshold, and date to generate an optimized route. You can reorder stops before assignment.
        </p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="manager-planning-tour-name" className="block text-sm font-medium text-gray-700">
            Tour name
          </label>
          <input
            id="manager-planning-tour-name"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="manager-planning-scheduled-for" className="block text-sm font-medium text-gray-700">
            Scheduled date/time
          </label>
          <input
            id="manager-planning-scheduled-for"
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="manager-planning-zone" className="block text-sm font-medium text-gray-700">
            Zone
          </label>
          <select
            id="manager-planning-zone"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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

        <div>
          <label htmlFor="manager-planning-fill-threshold" className="block text-sm font-medium text-gray-700">
            Fill threshold (%)
          </label>
          <input
            id="manager-planning-fill-threshold"
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={fillThresholdPercent}
            onChange={(event) => setFillThresholdPercent(Number(event.target.value))}
          />
        </div>

        <div>
          <label htmlFor="manager-planning-assigned-agent" className="block text-sm font-medium text-gray-700">
            Assign agent
          </label>
          <select
            id="manager-planning-assigned-agent"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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

        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
            onClick={optimizeRoute}
            disabled={optimizeMutation.isPending}
          >
            {optimizeMutation.isPending ? 'Optimizing...' : 'Run Optimization'}
          </button>

          <button
            type="button"
            className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-60"
            onClick={submitTour}
            disabled={createMutation.isPending || orderedRoute.length === 0}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Planned Tour'}
          </button>
        </div>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Optimized Route</h2>
        {optimizationMetrics && (
          <p className="text-sm text-gray-600 mt-1">
            Estimated distance: {optimizationMetrics.totalDistanceKm ?? 0} km - Estimated duration:{' '}
            {optimizationMetrics.estimatedDurationMinutes ?? 0} min
          </p>
        )}

        {orderedRoute.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Run optimization to generate candidate route order.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {orderedRoute.map((item, index) => (
              <li key={item.id} className="rounded-md border border-gray-100 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      #{index + 1} - {item.code} - {item.label}
                    </p>
                    <p className="text-xs text-gray-600">Fill level: {item.fillLevelPercent}%</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      onClick={() => moveRouteItem(index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      onClick={() => moveRouteItem(index, 1)}
                      disabled={index === orderedRoute.length - 1}
                    >
                      Down
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      {statusMessage && (
        <p className="text-sm font-medium text-emerald-700" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </section>
  );
}
