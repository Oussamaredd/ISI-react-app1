import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { useCreateCitizenReport } from "../hooks/useCitizen";
import { apiClient } from "../services/api";
import "../styles/OperationsPages.css";

type ContainerOption = {
  id: string;
  code: string;
  label: string;
};

type StatusTone = "success" | "error";

export default function CitizenReportPage() {
  const [containerId, setContainerId] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");

  const containersQuery = useQuery({
    queryKey: ["containers-options"],
    queryFn: async () => apiClient.get("/api/containers?page=1&pageSize=100"),
  });

  const createReportMutation = useCreateCitizenReport();

  const containerOptions = useMemo(() => {
    const rows = Array.isArray(
      (containersQuery.data as { containers?: unknown[] } | undefined)?.containers,
    )
      ? ((containersQuery.data as { containers: ContainerOption[] }).containers ??
        [])
      : [];

    return rows.map((item) => ({ id: item.id, code: item.code, label: item.label }));
  }, [containersQuery.data]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmationMessage("");

    try {
      const response = (await createReportMutation.mutateAsync({
        containerId,
        description,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        photoUrl: photoUrl || undefined,
      })) as { confirmationMessage?: string };

      setStatusTone("success");
      setConfirmationMessage(
        response.confirmationMessage ??
          "Report submitted. Thank you for helping your community.",
      );
      setDescription("");
      setPhotoUrl("");
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : "Failed to submit report.";
      setStatusTone("error");
      setConfirmationMessage(fallback);
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Report Overflowing Container</h1>
        <p>
          Share precise location details with optional evidence so operations
          teams can respond faster.
        </p>
      </header>

      <form className="ops-card ops-form" onSubmit={onSubmit}>
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
          >
            <option value="">Select a container</option>
            {containerOptions.map((container) => (
              <option key={container.id} value={container.id}>
                {container.code} - {container.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ops-field">
          <label htmlFor="citizen-report-description" className="ops-label">
            Description
          </label>
          <textarea
            id="citizen-report-description"
            className="ops-textarea"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
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
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
          </div>
          <div className="ops-field">
            <label htmlFor="citizen-report-longitude" className="ops-label">
              Longitude (optional)
            </label>
            <input
              id="citizen-report-longitude"
              className="ops-input"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </div>
        </div>

        <div className="ops-field">
          <label htmlFor="citizen-report-photo-url" className="ops-label">
            Photo URL (optional)
          </label>
          <input
            id="citizen-report-photo-url"
            className="ops-input"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
        </div>

        <div className="ops-actions">
          <button
            type="submit"
            className="ops-btn ops-btn-success"
            disabled={createReportMutation.isPending || containersQuery.isLoading}
          >
            {createReportMutation.isPending ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>

      {containersQuery.isError ? (
        <p className="ops-status ops-status-error">
          Could not load container options. Please refresh.
        </p>
      ) : null}

      {confirmationMessage ? (
        <p
          className={
            statusTone === "success"
              ? "ops-status ops-status-success"
              : "ops-status ops-status-error"
          }
          role="status"
          aria-live="polite"
        >
          {confirmationMessage}
        </p>
      ) : null}
    </section>
  );
}
