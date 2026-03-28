import React, { type PropsWithChildren } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { router } from "expo-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginScreen } from "@/features/auth/LoginScreen";
import { useSession } from "@/providers/SessionProvider";
import { mobileFireEvent, renderMobileScreen } from "./test-utils";

vi.mock("@/providers/SessionProvider", () => ({
  useSession: vi.fn(),
}));

vi.mock("../features/auth/AuthScreenLayout", () => ({
  AuthScreenLayout: ({
    children,
    subtitle,
    title,
  }: PropsWithChildren<{ subtitle: string; title: string }>) => (
    <section>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{children}</div>
    </section>
  ),
}));

describe("LoginScreen", () => {
  const signInMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      authState: "anonymous",
      isAuthenticated: false,
      isLoading: false,
      refreshSession: vi.fn(),
      signIn: signInMock,
      signOut: vi.fn(),
      signUp: vi.fn(),
      user: null,
    } as never);
  });

  it("validates input and submits normalized credentials", async () => {
    signInMock.mockResolvedValue(undefined);

    renderMobileScreen(<LoginScreen />);

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter your EcoTrack email/i)).toBeTruthy();
      expect(screen.getByText(/Enter your password/i)).toBeTruthy();
    });

    await mobileFireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: {
        value: " manager@example.com ",
      },
    });
    await mobileFireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: {
        value: "correcthorse",
      },
    });
    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: "manager@example.com",
        password: "correcthorse",
      });
    });
  });

  it("redirects authenticated managers to their role home route", async () => {
    vi.mocked(useSession).mockReturnValue({
      authState: "authenticated",
      isAuthenticated: true,
      isLoading: false,
      refreshSession: vi.fn(),
      signIn: signInMock,
      signOut: vi.fn(),
      signUp: vi.fn(),
      user: {
        id: "manager-1",
        email: "manager@example.com",
        displayName: "Manager",
        role: "manager",
        roles: [],
      },
    } as never);

    renderMobileScreen(<LoginScreen />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/(manager)");
    });
  });

  it("clears server errors, supports keyboard submission, and routes secondary auth actions", async () => {
    signInMock.mockRejectedValueOnce(new Error("Invalid credentials."));
    signInMock.mockResolvedValueOnce(undefined);

    renderMobileScreen(<LoginScreen />);

    const emailInput = screen.getByLabelText(/^Email$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(await screen.findByText(/Enter your EcoTrack email/i)).toBeTruthy();
    expect(await screen.findByText(/Enter your password/i)).toBeTruthy();

    fireEvent.blur(emailInput);
    fireEvent.blur(passwordInput);

    await mobileFireEvent.change(emailInput, {
      target: {
        value: "agent@example.com",
      },
    });
    await mobileFireEvent.change(passwordInput, {
      target: {
        value: "wrong-password",
      },
    });

    fireEvent.keyDown(emailInput, { key: "Enter" });
    fireEvent.keyDown(passwordInput, { key: "Enter" });

    expect(await screen.findByText(/Invalid credentials/i)).toBeTruthy();

    await mobileFireEvent.click(screen.getByRole("button", { name: /eye-outline/i }));
    expect(screen.getByRole("button", { name: /eye-off-outline/i })).toBeTruthy();

    await mobileFireEvent.change(passwordInput, {
      target: {
        value: "correct-password",
      },
    });

    await waitFor(() => {
      expect(screen.queryByText(/Invalid credentials/i)).toBeNull();
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: "agent@example.com",
        password: "correct-password",
      });
    });

    await mobileFireEvent.click(screen.getByRole("button", { name: /Forgot password\?/i }));
    await mobileFireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    expect(router.push).toHaveBeenCalledWith("/forgot-password");
    expect(router.push).toHaveBeenCalledWith("/signup");
  });
});
