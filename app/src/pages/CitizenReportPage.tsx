import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useMemo, useState } from 'react';

import { useCreateCitizenReport } from '../hooks/useCitizen';
import { apiClient } from '../services/api';

type ContainerOption = {
  id: string;
  code: string;
  label: string;
};

export default function CitizenReportPage() {
  const [containerId, setContainerId] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const containersQuery = useQuery({
    queryKey: ['containers-options'],
    queryFn: async () => apiClient.get('/api/containers?page=1&pageSize=100'),
  });

  const createReportMutation = useCreateCitizenReport();

  const containerOptions = useMemo(() => {
    const rows = Array.isArray((containersQuery.data as { containers?: unknown[] } | undefined)?.containers)
      ? ((containersQuery.data as { containers: ContainerOption[] }).containers ?? [])
      : [];

    return rows.map((item) => ({ id: item.id, code: item.code, label: item.label }));
  }, [containersQuery.data]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmationMessage('');

    try {
      const response = (await createReportMutation.mutateAsync({
        containerId,
        description,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        photoUrl: photoUrl || undefined,
      })) as { confirmationMessage?: string };

      setConfirmationMessage(
        response.confirmationMessage ?? 'Report submitted. Thank you for helping your community.',
      );
      setDescription('');
      setPhotoUrl('');
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Failed to submit report.';
      setConfirmationMessage(fallback);
    }
  };

  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Report Overflowing Container</h1>
      <p className="mt-2 text-sm text-gray-600">
        Submit location details and an optional photo URL. Duplicate reports for the same container in a short
        time window are prevented automatically.
      </p>

      <form className="mt-6 space-y-4 max-w-2xl" onSubmit={onSubmit}>
        <div>
          <label htmlFor="citizen-report-container" className="block text-sm font-medium text-gray-700">
            Container
          </label>
          <select
            id="citizen-report-container"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={containerId}
            onChange={(event) => setContainerId(event.target.value)}
            required
          >
            <option value="">Select a container</option>
            {containerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.code} - {container.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="citizen-report-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="citizen-report-description"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="citizen-report-latitude" className="block text-sm font-medium text-gray-700">
              Latitude (optional)
            </label>
            <input
              id="citizen-report-latitude"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="citizen-report-longitude" className="block text-sm font-medium text-gray-700">
              Longitude (optional)
            </label>
            <input
              id="citizen-report-longitude"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="citizen-report-photo-url" className="block text-sm font-medium text-gray-700">
            Photo URL (optional)
          </label>
          <input
            id="citizen-report-photo-url"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700 disabled:opacity-60"
          disabled={createReportMutation.isPending || containersQuery.isLoading}
        >
          {createReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>

      {confirmationMessage && (
        <p className="mt-4 text-sm font-medium text-green-700" role="status" aria-live="polite">
          {confirmationMessage}
        </p>
      )}
    </section>
  );
}
