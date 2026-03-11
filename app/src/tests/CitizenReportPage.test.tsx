import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import CitizenReportPage from "../pages/CitizenReportPage";
import { apiClient } from "../services/api";
import { renderWithProviders } from "./test-utils";

vi.mock("../hooks/useCitizen", () => ({
  useCreateCitizenReport: vi.fn(),
}));

describe("CitizenReportPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window.navigator, "geolocation");

    const citizenHooks = await import("../hooks/useCitizen");
    (citizenHooks.useCreateCitizenReport as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
    vi.spyOn(apiClient, "get").mockResolvedValue({
      containers: [{ id: "container-1", code: "CTR-001", label: "Harbor Front" }],
    });
  });

  it("shows a browser geolocation warning and clears it after manual coordinate edits", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(await screen.findByRole("heading", { name: /Report Overflowing Container/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Use My Location/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Device geolocation is not available in this browser/i,
    );

    await user.type(screen.getByLabelText(/Latitude/i), "48.8566");

    await waitFor(() => {
      expect(
        screen.queryByText(/Device geolocation is not available in this browser/i),
      ).not.toBeInTheDocument();
    });
  });

  it("shows location capture failures and API submission errors", async () => {
    const citizenHooks = await import("../hooks/useCitizen");
    const mutateAsync = vi.fn().mockRejectedValue(new Error("Dispatch queue unavailable."));

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(
          (_success: PositionCallback, error?: PositionErrorCallback) =>
            error?.({ code: 1, message: "denied" } as GeolocationPositionError),
        ),
      },
    });

    (citizenHooks.useCreateCitizenReport as Mock).mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    await user.click(screen.getByRole("button", { name: /Use My Location/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /We could not access your device location/i,
    );

    await user.selectOptions(screen.getByLabelText(/Container/i), "container-1");
    await user.type(
      screen.getByLabelText(/Description/i),
      "Container is overflowing near the tram stop.",
    );
    await user.type(screen.getByLabelText(/Longitude/i), "2.3522");
    await user.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        containerId: "container-1",
        description: "Container is overflowing near the tram stop.",
        latitude: undefined,
        longitude: "2.3522",
        photoUrl: undefined,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/Dispatch queue unavailable/i);
  });

  it("uses the default confirmation text when the API does not return one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(await screen.findByRole("option", { name: /CTR-001 - Harbor Front/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Container/i), "container-1");
    await user.type(screen.getByLabelText(/Description/i), "Overflowing bin beside the market.");
    await user.click(screen.getByRole("button", { name: /Submit Report/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /Report submitted\. Thank you for helping your community\./i,
    );
  });

  it("shows a clear error banner when container options cannot be loaded", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("container lookup failed"));

    renderWithProviders(<CitizenReportPage />);

    expect(await screen.findByText(/Could not load container options\. Please refresh\./i)).toBeInTheDocument();
  });
});
