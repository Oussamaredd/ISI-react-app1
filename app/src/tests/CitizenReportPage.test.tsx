import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import CitizenReportPage from "../pages/CitizenReportPage";
import { ApiRequestError, apiClient } from "../services/api";
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
      containers: [
        {
          id: "container-1",
          code: "CTR-001",
          label: "17 RUE CROIX DES PETITS CHAMPS - Trilib",
          fillLevelPercent: 76,
          status: "attention_required",
          zoneName: "Paris 1er - Louvre",
        },
      ],
    });
  });

  it("shows a browser geolocation warning and clears it after manual coordinate edits", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByRole("heading", { name: /Report Container Issue/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Use My Location/i }));
    expect(
      await screen.findByText(
        /Device geolocation is not available in this browser\. Continue by selecting the mapped container manually\./i,
      ),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Latitude/i), "48.8566");

    await waitFor(() => {
      expect(
        screen.queryByText(/Device geolocation is not available in this browser/i),
      ).not.toBeInTheDocument();
    });
  });

  it("shows selected container context before submission", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByRole("option", { name: /CTR-001 - 17 RUE CROIX DES PETITS CHAMPS - Trilib/i }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^Container$/i), "container-1");

    expect(
      await screen.findByRole("heading", { name: /Selected Container Context/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Paris 1er - Louvre/i)).toBeInTheDocument();
    expect(screen.getByText(/Attention Required/i)).toBeInTheDocument();
    expect(screen.getByText(/76%/i)).toBeInTheDocument();
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

    expect(
      await screen.findByRole("option", { name: /CTR-001 - 17 RUE CROIX DES PETITS CHAMPS - Trilib/i }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Find a mapped container/i), "unknown place");
    expect(
      await screen.findByText(/No mapped containers match this search/i),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Find a mapped container/i));
    await user.click(screen.getByRole("button", { name: /Use My Location/i }));
    expect(
      await screen.findByText(
        /We could not access your device location\. Continue by selecting the mapped container manually or enter coordinates yourself\./i,
      ),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^Container$/i), "container-1");
    await user.type(
      screen.getByLabelText(/Details \(optional\)/i),
      "Container is overflowing near the tram stop.",
    );
    await user.type(screen.getByLabelText(/Longitude/i), "2.3522");
    await user.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        containerId: "container-1",
        reportType: "container_full",
        description: "Container is overflowing near the tram stop.",
        latitude: undefined,
        longitude: "2.3522",
        photoUrl: undefined,
      });
    });
    expect(await screen.findByText(/Dispatch queue unavailable/i)).toBeInTheDocument();
  });

  it("uses the default confirmation text when the API does not return one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByRole("option", { name: /CTR-001 - 17 RUE CROIX DES PETITS CHAMPS - Trilib/i }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^Container$/i), "container-1");
    await user.click(screen.getByRole("button", { name: /Submit Report/i }));

    expect(await screen.findByText(/Report submitted\. Thank you for helping your community\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Profile & History/i })).toHaveAttribute(
      "href",
      "/app/citizen/profile",
    );
  });

  it("shows a clear error banner when container options cannot be loaded", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("container lookup failed"));

    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByText(/Could not load mapped containers\. Refresh the page and try again\./i),
    ).toBeInTheDocument();
  });

  it("maps duplicate-report conflicts to explicit recovery guidance", async () => {
    const citizenHooks = await import("../hooks/useCitizen");
    const mutateAsync = vi
      .fn()
      .mockRejectedValue(
        new ApiRequestError(
          "You already reported this issue for this container within the last hour.",
          409,
          {},
        ),
      );

    (citizenHooks.useCreateCitizenReport as Mock).mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByRole("option", { name: /CTR-001 - 17 RUE CROIX DES PETITS CHAMPS - Trilib/i }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^Container$/i), "container-1");
    await user.click(screen.getByRole("button", { name: /Submit Report/i }));

    expect(
      await screen.findByText(
        /You already reported this issue for this container within the last hour\. Open your profile or history instead of creating a duplicate report\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an explicit blocked state when no mapped containers are available", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ containers: [] });

    renderWithProviders(<CitizenReportPage />);

    expect(
      await screen.findByText(/No mapped containers are available right now\./i),
    ).toBeInTheDocument();
  });
});
