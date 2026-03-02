import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SettingsPage from "../pages/SettingsPage";
import { renderWithRouter } from "./test-utils";

const mockUseAuth = vi.fn();
const updateProfileMock = vi.fn();
const changePasswordMock = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../services/authApi", () => ({
  authApi: {
    updateProfile: (displayName: string, avatarUrl?: string | null) =>
      updateProfileMock(displayName, avatarUrl),
    changePassword: (currentPassword: string, newPassword: string) =>
      changePasswordMock(currentPassword, newPassword),
  },
}));

describe("SettingsPage", () => {
  const refreshAuthMock = vi.fn();

  beforeEach(() => {
    updateProfileMock.mockReset();
    changePasswordMock.mockReset();
    refreshAuthMock.mockReset();
    refreshAuthMock.mockResolvedValue(undefined);
    updateProfileMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "alex@ecotrack.dev",
        displayName: "Alex Rivera",
      },
    });
    changePasswordMock.mockResolvedValue({ success: true });

    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "alex@ecotrack.dev",
        displayName: "Alex Rivera",
        avatarUrl: "https://cdn.ecotrack.dev/alex.png",
        role: "manager",
        provider: "google",
        isActive: true,
      },
      refreshAuth: refreshAuthMock,
    });
  });

  test("renders improved account settings sections", () => {
    renderWithRouter(<SettingsPage />, { route: "/app/settings", withAuthProvider: false });

    expect(screen.getByRole("heading", { name: "Account Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Password reset" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Security overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Account" })).toBeDisabled();
  });

  test("shows validation message when display name is too short", async () => {
    renderWithRouter(<SettingsPage />, { route: "/app/settings", withAuthProvider: false });

    const displayNameInput = screen.getByRole("textbox", { name: /display name/i });
    fireEvent.change(displayNameInput, { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Account" }));

    expect(
      await screen.findByText("Display name must be at least 2 characters."),
    ).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  test("submits profile update and refreshes auth state", async () => {
    renderWithRouter(<SettingsPage />, { route: "/app/settings", withAuthProvider: false });

    fireEvent.change(screen.getByRole("textbox", { name: /display name/i }), {
      target: { value: "Alex R." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Account" }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith("Alex R.", "https://cdn.ecotrack.dev/alex.png");
      expect(refreshAuthMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Profile updated successfully.")).toBeInTheDocument();
  });

  test("shows validation message for unsupported avatar file", async () => {
    renderWithRouter(<SettingsPage />, { route: "/app/settings", withAuthProvider: false });

    const fileInput = document.querySelector(".app-settings-avatar-input") as HTMLInputElement;
    const invalidFile = new File(["bad"], "avatar.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(await screen.findByText("Please choose a PNG, JPEG, or WEBP image.")).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  test("submits local password change", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "alex@ecotrack.dev",
        displayName: "Alex Rivera",
        role: "manager",
        provider: "local",
        isActive: true,
      },
      refreshAuth: refreshAuthMock,
    });

    renderWithRouter(<SettingsPage />, { route: "/app/settings", withAuthProvider: false });

    const currentPasswordInput = document.getElementById("currentPassword") as HTMLInputElement;
    const newPasswordInput = document.getElementById("newPassword") as HTMLInputElement;
    const confirmPasswordInput = document.getElementById("confirmPassword") as HTMLInputElement;

    fireEvent.change(currentPasswordInput, {
      target: { value: "CurrentPass123!" },
    });
    fireEvent.change(newPasswordInput, {
      target: { value: "UpdatedPass123!" },
    });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "UpdatedPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Account" }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith("CurrentPass123!", "UpdatedPass123!");
    });

    expect(screen.getByText("Password changed successfully.")).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });
});
