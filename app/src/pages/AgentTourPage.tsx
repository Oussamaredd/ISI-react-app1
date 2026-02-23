import { useMemo, useState } from 'react';

import {
  useAgentTour,
  useAnomalyTypes,
  useReportAnomaly,
  useStartAgentTour,
  useTourActivity,
  useValidateTourStop,
} from '../hooks/useAgentTours';

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
  const [qrCode, setQrCode] = useState('');
  const [manualContainerId, setManualContainerId] = useState('');
  const [volumeLiters, setVolumeLiters] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [anomalyTypeId, setAnomalyTypeId] = useState('');
  const [anomalyComments, setAnomalyComments] = useState('');
  const [anomalyPhotoUrl, setAnomalyPhotoUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

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
        itinerary?: Array<{ stopId: string; order: number; latitude?: string | null; longitude?: string | null }>;
      }
    | null;

  const stops = Array.isArray(tour?.stops) ? tour.stops : [];
  const activeStop = useMemo(
    () => stops.find((stop) => stop.status === 'active') ?? stops.find((stop) => stop.status === 'pending') ?? null,
    [stops],
  );

  const activityQuery = useTourActivity(tour?.id);
  const activityRows =
    ((activityQuery.data as { activity?: Array<{ id: string; type: string; createdAt: string; details: unknown }> } | undefined)
      ?.activity ?? []);

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

    setStatusMessage('');

    try {
      const payload = {
        tourId: tour.id,
        stopId: activeStop.id,
        volumeLiters: Number(volumeLiters),
        qrCode: qrCode || undefined,
        containerId: manualContainerId || undefined,
        notes: validationNotes || undefined,
      };

      const response = (await validateStopMutation.mutateAsync(payload)) as { nextStopId?: string | null };

      setStatusMessage(
        response.nextStopId
          ? `Collection validated. Auto-advanced to next stop (${response.nextStopId}).`
          : 'Collection validated. Tour completed.',
      );
      setQrCode('');
      setManualContainerId('');
      setVolumeLiters('');
      setValidationNotes('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to validate collection stop.');
    }
  };

  const submitAnomaly = async () => {
    if (!tour || !anomalyTypeId) {
      return;
    }

    setStatusMessage('');

    try {
      const response = (await reportAnomalyMutation.mutateAsync({
        tourId: tour.id,
        anomalyTypeId,
        tourStopId: activeStop?.id,
        comments: anomalyComments || undefined,
        photoUrl: anomalyPhotoUrl || undefined,
        severity: 'medium',
      })) as { managerAlertTriggered?: boolean };

      setStatusMessage(
        response.managerAlertTriggered
          ? 'Anomaly reported and manager alert triggered.'
          : 'Anomaly reported.',
      );
      setAnomalyComments('');
      setAnomalyPhotoUrl('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to report anomaly.');
    }
  };

  if (agentTourQuery.isLoading) {
    return <section className="p-6 text-sm text-gray-600">Loading assigned tour...</section>;
  }

  if (!tour) {
    return (
      <section className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Daily Agent Tour</h1>
        <p className="mt-2 text-sm text-gray-600">No assigned tour is available for your account yet.</p>
      </section>
    );
  }

  return (
    <section className="p-4 sm:p-6 space-y-4">
      <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{tour.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Zone: {tour.zoneName ?? 'Unassigned'} - Scheduled {tour.scheduledFor ? new Date(tour.scheduledFor).toLocaleString() : 'N/A'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-medium">Status: {tour.status}</span>
          <button
            type="button"
            className="rounded-md bg-emerald-600 text-white px-3 py-1 text-sm hover:bg-emerald-700 disabled:opacity-50"
            disabled={tour.status === 'in_progress' || startTourMutation.isPending}
            onClick={() => startTourMutation.mutate(tour.id)}
          >
            {tour.status === 'in_progress' ? 'Tour In Progress' : 'Start Tour'}
          </button>
        </div>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Itinerary Map</h2>
        {itineraryCoordinates.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No coordinate data available for map rendering.</p>
        ) : (
          <svg viewBox="0 0 100 100" className="mt-3 w-full max-w-md rounded-lg border border-gray-100 bg-gray-50 p-2">
            <polyline
              points={itineraryCoordinates.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2"
            />
            {itineraryCoordinates.map((point) => (
              <g key={point.order}>
                <circle cx={point.x} cy={point.y} r="3" fill="#0f766e" />
                <text x={point.x + 2} y={point.y - 2} fontSize="4" fill="#0f172a">
                  {point.order}
                </text>
              </g>
            ))}
          </svg>
        )}
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Ordered Stops</h2>
        <ul className="mt-3 space-y-2">
          {stops.map((stop) => (
            <li
              key={stop.id}
              className={`rounded-md border px-3 py-2 text-sm ${
                stop.status === 'active'
                  ? 'border-emerald-300 bg-emerald-50'
                  : stop.status === 'completed'
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <p className="font-medium text-gray-900">
                #{stop.stopOrder} - {stop.containerCode} - {stop.containerLabel}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Status: {stop.status} {stop.eta ? `- ETA ${new Date(stop.eta).toLocaleTimeString()}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Validate Active Stop</h2>
        {activeStop ? (
          <>
            <p className="text-sm text-gray-600">
              Active stop: #{activeStop.stopOrder} - {activeStop.containerCode}
            </p>

            <label htmlFor="agent-tour-volume-liters" className="block text-xs font-medium text-gray-700">
              Volume (liters)
            </label>
            <input
              id="agent-tour-volume-liters"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              type="number"
              value={volumeLiters}
              onChange={(event) => setVolumeLiters(event.target.value)}
              placeholder="e.g. 120"
            />

            <label htmlFor="agent-tour-qr-code" className="block text-xs font-medium text-gray-700">
              QR code (optional)
            </label>
            <input
              id="agent-tour-qr-code"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder="Scan or type QR value"
            />

            <label htmlFor="agent-tour-manual-container" className="block text-xs font-medium text-gray-700">
              Manual fallback container
            </label>
            <select
              id="agent-tour-manual-container"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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

            <label htmlFor="agent-tour-validation-notes" className="block text-xs font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              id="agent-tour-validation-notes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={validationNotes}
              onChange={(event) => setValidationNotes(event.target.value)}
            />

            <button
              type="button"
              className="rounded-md bg-indigo-600 text-white px-3 py-2 text-sm hover:bg-indigo-700 disabled:opacity-60"
              onClick={submitValidation}
              disabled={!volumeLiters || validateStopMutation.isPending}
            >
              {validateStopMutation.isPending ? 'Validating...' : 'Validate Stop'}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">No active stop pending validation.</p>
        )}
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Report Anomaly</h2>

        <label htmlFor="agent-tour-anomaly-type" className="block text-xs font-medium text-gray-700">
          Anomaly type
        </label>
        <select
          id="agent-tour-anomaly-type"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={anomalyTypeId}
          onChange={(event) => setAnomalyTypeId(event.target.value)}
        >
          <option value="">Select anomaly type</option>
          {((anomalyTypesQuery.data as { anomalyTypes?: Array<{ id: string; label: string }> } | undefined)
            ?.anomalyTypes ?? []
          ).map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>

        <label htmlFor="agent-tour-anomaly-comments" className="block text-xs font-medium text-gray-700">
          Comments
        </label>
        <textarea
          id="agent-tour-anomaly-comments"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          value={anomalyComments}
          onChange={(event) => setAnomalyComments(event.target.value)}
        />

        <label htmlFor="agent-tour-anomaly-photo-url" className="block text-xs font-medium text-gray-700">
          Photo URL (optional)
        </label>
        <input
          id="agent-tour-anomaly-photo-url"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={anomalyPhotoUrl}
          onChange={(event) => setAnomalyPhotoUrl(event.target.value)}
        />

        <button
          type="button"
          className="rounded-md bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700 disabled:opacity-60"
          disabled={!anomalyTypeId || reportAnomalyMutation.isPending}
          onClick={submitAnomaly}
        >
          {reportAnomalyMutation.isPending ? 'Reporting...' : 'Report Anomaly'}
        </button>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Tour Activity History</h2>
        <ul className="mt-3 space-y-2">
          {activityRows.length === 0 ? (
            <li className="text-sm text-gray-500">No activity captured yet.</li>
          ) : (
            activityRows.map((item) => (
              <li key={item.id} className="rounded-md border border-gray-100 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{item.type}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </article>

      {statusMessage && (
        <p className="text-sm font-medium text-emerald-700" role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
    </section>
  );
}
