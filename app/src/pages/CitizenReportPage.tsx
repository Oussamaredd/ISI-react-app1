import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCreateCitizenReport } from '../hooks/useCitizen';
import {
  DEFAULT_CITIZEN_REPORT_TYPE,
  citizenReportTypes,
  type CitizenReportType,
} from '../lib/citizenReports';
import { ApiRequestError, apiClient } from '../services/api';
import '../styles/OperationsPages.css';

type ContainerOption = {
  id: string;
  code: string;
  label: string;
  fillLevelPercent?: number | null;
  status?: string | null;
  zoneName?: string | null;
};

type StatusTone = 'success' | 'error';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatContainerStatus = (value?: string | null) => {
  if (!value) {
    return 'Unknown';
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const formatFillLevel = (value?: number | null) =>
  typeof value === 'number' ? `${Math.round(value)}%` : 'Unavailable';

const normalizeSearchValue = (value: string) => value.trim().toLowerCase();

const normalizeOptionalField = (value: string) => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const isValidLatitude = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
};

const isValidLongitude = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
};

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const containerMatchesSearch = (container: ContainerOption, searchTerm: string) => {
  const normalizedSearch = normalizeSearchValue(searchTerm);
  if (!normalizedSearch) {
    return true;
  }

  return [container.code, container.label, container.zoneName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .some((value) => value.toLowerCase().includes(normalizedSearch));
};

const resolveSubmissionMessage = (error: unknown) => {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return 'The selected mapped container is no longer available. Reload the list and choose another container.';
    }

    if (error.status === 409) {
      return 'You already reported this issue for this container within the last hour. Open your profile or history instead of creating a duplicate report.';
    }

    if (error.status === 401) {
      return 'Your session expired. Sign in again to continue reporting.';
    }

    if (error.status === 400) {
      const details =
        error.payload &&
        typeof error.payload === 'object' &&
        Array.isArray((error.payload as { details?: unknown }).details)
          ? (error.payload as { details: unknown[] }).details.filter(
              (detail): detail is string => typeof detail === 'string' && detail.trim().length > 0,
            )
          : [];

      if (details.length > 0) {
        return details[0];
      }

      return 'Report details are invalid. Review the selected container, coordinates, and photo URL before submitting again.';
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Failed to submit report. Please try again.';
};

export default function CitizenReportPage() {
  const [containerId, setContainerId] = useState('');
  const [containerSearch, setContainerSearch] = useState('');
  const [reportType, setReportType] = useState<CitizenReportType>(
    DEFAULT_CITIZEN_REPORT_TYPE,
  );
  const [description, setDescription] = useState('');
  const [reportedLocation, setReportedLocation] = useState({ latitude: '', longitude: '' });
  const [photoUrl, setPhotoUrl] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');
  const [locationTone, setLocationTone] = useState<StatusTone>('success');

  const containersQuery = useQuery({
    queryKey: ['containers-options'],
    queryFn: async () => apiClient.get('/api/containers?page=1&pageSize=100'),
  });

  const createReportMutation = useCreateCitizenReport();
  const supportsGeolocation = typeof window !== 'undefined' && 'geolocation' in navigator;

  const containerOptions = useMemo(() => {
    const rows = Array.isArray(
      (containersQuery.data as { containers?: unknown[] } | undefined)?.containers,
    )
      ? ((containersQuery.data as { containers: ContainerOption[] }).containers ?? [])
      : [];

    return rows.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      fillLevelPercent: item.fillLevelPercent ?? null,
      status: item.status ?? null,
      zoneName: item.zoneName ?? null,
    }));
  }, [containersQuery.data]);

  const selectedContainer = useMemo(
    () => containerOptions.find((item) => item.id === containerId) ?? null,
    [containerId, containerOptions],
  );

  const filteredContainerOptions = useMemo(
    () => containerOptions.filter((item) => containerMatchesSearch(item, containerSearch)),
    [containerOptions, containerSearch],
  );

  const visibleContainerOptions = useMemo(() => {
    if (!selectedContainer) {
      return filteredContainerOptions;
    }

    return filteredContainerOptions.some((item) => item.id === selectedContainer.id)
      ? filteredContainerOptions
      : [selectedContainer, ...filteredContainerOptions];
  }, [filteredContainerOptions, selectedContainer]);

  const hasMappedContainers = containerOptions.length > 0;
  const searchHasMatches = visibleContainerOptions.length > 0;
  const selectedReportType =
    citizenReportTypes.find((item) => item.value === reportType) ?? citizenReportTypes[0];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmationMessage('');

    const normalizedContainerId = containerId.trim();
    const normalizedLatitude = normalizeOptionalField(reportedLocation.latitude);
    const normalizedLongitude = normalizeOptionalField(reportedLocation.longitude);
    const normalizedPhotoUrl = normalizeOptionalField(photoUrl);

    if (!UUID_PATTERN.test(normalizedContainerId)) {
      setStatusTone('error');
      setConfirmationMessage(
        'The selected mapped container is invalid. Reload the page and choose a live container before submitting again.',
      );
      return;
    }

    if (normalizedLatitude && !isValidLatitude(normalizedLatitude)) {
      setStatusTone('error');
      setConfirmationMessage('Latitude must be a valid value between -90 and 90.');
      return;
    }

    if (normalizedLongitude && !isValidLongitude(normalizedLongitude)) {
      setStatusTone('error');
      setConfirmationMessage('Longitude must be a valid value between -180 and 180.');
      return;
    }

    if (normalizedPhotoUrl && !isValidHttpUrl(normalizedPhotoUrl)) {
      setStatusTone('error');
      setConfirmationMessage('Photo URL must use http or https.');
      return;
    }

    try {
      const response = (await createReportMutation.mutateAsync({
        containerId: normalizedContainerId,
        reportType,
        description: description.trim() || undefined,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        photoUrl: normalizedPhotoUrl,
      })) as { confirmationMessage?: string };

      setStatusTone('success');
      setConfirmationMessage(
        response.confirmationMessage ??
          'Report submitted. Thank you for helping your community.',
      );
      setDescription('');
      setPhotoUrl('');
    } catch (error) {
      setStatusTone('error');
      setConfirmationMessage(resolveSubmissionMessage(error));
    }
  };

  const updateReportedLocation = (field: 'latitude' | 'longitude', value: string) => {
    if (locationMessage) {
      setLocationMessage('');
    }

    setReportedLocation((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const captureDeviceLocation = () => {
    if (!supportsGeolocation) {
      setLocationTone('error');
      setLocationMessage(
        'Device geolocation is not available in this browser. Continue by selecting the mapped container manually.',
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportedLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setLocationTone('success');
        setLocationMessage('Location captured from your device.');
      },
      () => {
        setLocationTone('error');
        setLocationMessage(
          'We could not access your device location. Continue by selecting the mapped container manually or enter coordinates yourself.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Report Container Issue</h1>
        <p>
          Select an existing mapped container, review its latest known state,
          and send a typed issue report for manager triage.
        </p>
      </header>

      <form className="ops-card ops-form" onSubmit={onSubmit}>
        <p className="ops-helper">
          Citizens report issues on existing mapped containers only. Web GPS is
          optional here, so you can keep going with manual mapped-container
          selection if location is unavailable.
        </p>

        <div className="ops-field">
          <label htmlFor="citizen-report-search" className="ops-label">
            Find a mapped container
          </label>
          <input
            id="citizen-report-search"
            className="ops-input"
            placeholder="Search by code, address, waste stream, or zone"
            value={containerSearch}
            onChange={(event) => setContainerSearch(event.target.value)}
            disabled={containersQuery.isLoading || containersQuery.isError || !hasMappedContainers}
          />
          <p className="ops-helper">
            Search the live mapped-container list if the nearest container is not obvious.
          </p>
        </div>

        <div className="ops-field">
          <label htmlFor="citizen-report-container" className="ops-label">
            Container
          </label>
          <select
            id="citizen-report-container"
            className="ops-select"
            value={containerId}
            onChange={(event) => setContainerId(event.target.value)}
            required
            disabled={containersQuery.isLoading || containersQuery.isError || !hasMappedContainers}
          >
            <option value="">
              {containersQuery.isLoading
                ? 'Loading mapped containers...'
                : hasMappedContainers
                  ? 'Select a container'
                  : 'No mapped containers available'}
            </option>
            {visibleContainerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.code} - {container.label}
              </option>
            ))}
          </select>
        </div>

        {containersQuery.isLoading ? (
          <p className="ops-status ops-status-info">Loading mapped containers for citizen reporting.</p>
        ) : null}

        {!containersQuery.isLoading && !containersQuery.isError && !hasMappedContainers ? (
          <p className="ops-status ops-status-error">
            No mapped containers are available right now. Try again later or contact support if
            the coverage data should already exist.
          </p>
        ) : null}

        {!containersQuery.isLoading &&
        !containersQuery.isError &&
        hasMappedContainers &&
        normalizeSearchValue(containerSearch).length > 0 &&
        !searchHasMatches ? (
          <p className="ops-status ops-status-info">
            No mapped containers match this search. Try another code, address, zone, or clear the
            filter.
          </p>
        ) : null}

        {selectedContainer ? (
          <article className="ops-card">
            <h2>Selected Container Context</h2>
            <p className="ops-card-intro">
              {selectedContainer.code} - {selectedContainer.label}
            </p>
            <div className="ops-grid ops-grid-3">
              <div className="ops-field">
                <span className="ops-label">Zone</span>
                <span>{selectedContainer.zoneName ?? 'Unavailable'}</span>
              </div>
              <div className="ops-field">
                <span className="ops-label">Status</span>
                <span>{formatContainerStatus(selectedContainer.status)}</span>
              </div>
              <div className="ops-field">
                <span className="ops-label">Last known fill</span>
                <span>{formatFillLevel(selectedContainer.fillLevelPercent)}</span>
              </div>
            </div>
          </article>
        ) : null}

        <div className="ops-field">
          <label htmlFor="citizen-report-type" className="ops-label">
            Issue type
          </label>
          <select
            id="citizen-report-type"
            className="ops-select"
            value={reportType}
            onChange={(event) => setReportType(event.target.value as CitizenReportType)}
          >
            {citizenReportTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="ops-helper">{selectedReportType.helper}</p>
        </div>

        <div className="ops-field">
          <label htmlFor="citizen-report-description" className="ops-label">
            Details (optional)
          </label>
          <textarea
            id="citizen-report-description"
            className="ops-textarea"
            rows={4}
            placeholder="Add context that helps operations validate the issue."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="ops-grid ops-grid-2 sm:grid-cols-2">
          <div className="ops-field">
            <label htmlFor="citizen-report-latitude" className="ops-label">
              Latitude (optional)
            </label>
            <input
              id="citizen-report-latitude"
              className="ops-input"
              inputMode="decimal"
              value={reportedLocation.latitude}
              onChange={(event) => updateReportedLocation('latitude', event.target.value)}
            />
          </div>
          <div className="ops-field">
            <label htmlFor="citizen-report-longitude" className="ops-label">
              Longitude (optional)
            </label>
            <input
              id="citizen-report-longitude"
              className="ops-input"
              inputMode="decimal"
              value={reportedLocation.longitude}
              onChange={(event) => updateReportedLocation('longitude', event.target.value)}
            />
          </div>
        </div>

        <div className="ops-actions">
          <button
            type="button"
            className="ops-btn ops-btn-outline"
            onClick={captureDeviceLocation}
            disabled={createReportMutation.isPending}
          >
            Use My Location
          </button>
        </div>

        {locationMessage ? (
          <p
            className={
              locationTone === 'success'
                ? 'ops-status ops-status-success'
                : 'ops-status ops-status-error'
            }
            role="status"
          >
            {locationMessage}
          </p>
        ) : null}

        <div className="ops-field">
          <label htmlFor="citizen-report-photo-url" className="ops-label">
            Photo URL (optional, http/https)
          </label>
          <input
            id="citizen-report-photo-url"
            type="url"
            className="ops-input"
            placeholder="https://example.com/container.jpg"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
        </div>

        <div className="ops-actions">
          <button
            type="submit"
            className="ops-btn ops-btn-success"
            disabled={
              createReportMutation.isPending ||
              containersQuery.isLoading ||
              containersQuery.isError ||
              !hasMappedContainers
            }
          >
            {createReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      {containersQuery.isError ? (
        <p className="ops-status ops-status-error">
          Could not load mapped containers. Refresh the page and try again.
        </p>
      ) : null}

      {confirmationMessage ? (
        <div className="ops-grid">
          <p
            className={
              statusTone === 'success'
                ? 'ops-status ops-status-success'
                : 'ops-status ops-status-error'
            }
            role="status"
            aria-live="polite"
          >
            {confirmationMessage}
          </p>

          {statusTone === 'success' ? (
            <div className="ops-actions">
              <Link to="/app/citizen/profile" className="ops-btn ops-btn-outline">
                Open Profile & History
              </Link>
              <Link to="/app/citizen/challenges" className="ops-btn ops-btn-outline">
                View Challenges
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
