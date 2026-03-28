import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SystemSettings } from "../components/admin/SystemSettings";

const addToastMock = vi.fn();
const updateSettingsMock = vi.fn();
const dispatchTestNotificationMock = vi.fn();

const baseSettings = {
  user_registration: true,
  default_user_role: "citizen",
  session_timeout: 24 * 60 * 60 * 1000,
  audit_log_retention: 90,
  max_login_attempts: 5,
  password_min_length: 8,
  email_notifications: true,
  maintenance_mode: false,
  site_name: "EcoTrack Platform",
  site_description: "EcoTrack support and operations platform",
  timezone: "UTC",
  date_format: "MM/DD/YYYY",
  currency: "USD",
  ecotrack_thresholds: {
    defaults: {
      residential: 80,
      commercial: 75,
      industrial: 70,
    },
    byZone: {},
  },
  notification_channels: [
    { id: "ops-email", channel: "email", recipient: "ops@example.com", enabled: true },
  ],
  notification_templates: {
    critical_alert: "Critical alert",
    warning_alert: "Warning alert",
    info_alert: "Info alert",
  },
  severity_channel_routing: {
    critical: ["email", "sms"],
    warning: ["email"],
    info: ["email"],
  },
  chatbot_contract_version: "1.0",
};

vi.mock("../hooks/adminHooks", () => ({
  useSystemSettings: () => ({
    data: baseSettings,
    isLoading: false,
  }),
  useUpdateSystemSettings: () => ({
    mutateAsync: updateSettingsMock,
    isPending: false,
  }),
  useDispatchTestNotification: () => ({
    mutateAsync: dispatchTestNotificationMock,
    isPending: false,
  }),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({
    addToast: addToastMock,
  }),
}));

describe("SystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSettingsMock.mockResolvedValue(baseSettings);
    dispatchTestNotificationMock.mockResolvedValue({ success: true });
  });

  it("announces successful save and dispatch actions through live status messaging", async () => {
    render(<SystemSettings />);

    fireEvent.change(screen.getByDisplayValue(/EcoTrack Platform/i), {
      target: { value: "EcoTrack HQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(
      await screen.findByRole("status", { name: "" }).catch(() => null),
    ).toBeTruthy();
    expect(await screen.findByText(/System settings saved successfully\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Dispatch Test/i }));

    await waitFor(() => {
      expect(dispatchTestNotificationMock).toHaveBeenCalledWith({
        severity: "warning",
        recipient: undefined,
        message: "Test EcoTrack notification dispatch",
      });
    });

    expect(await screen.findByText(/Test warning notification dispatched\./i)).toBeInTheDocument();
  });

  it("surfaces save failures through an explicit alert region", async () => {
    updateSettingsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    render(<SystemSettings />);

    fireEvent.change(screen.getByDisplayValue(/EcoTrack Platform/i), {
      target: { value: "EcoTrack HQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/Unable to save system settings: gateway unavailable/i);
  });
});
