import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '../hooks/useAuth';
import AppHomePage from '../pages/AppHomePage';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

describe('AppHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: 'citizen-1',
        displayName: 'Citizen User',
        email: 'citizen@example.com',
        avatarUrl: null,
        role: 'citizen',
        roles: [{ id: 'role-citizen', name: 'citizen' }],
        isActive: true,
        provider: 'local',
      },
      isAuthenticated: true,
      isLoading: false,
      authState: 'authenticated',
      error: null,
    });
  });

  it('keeps the citizen role hub lightweight and points follow-up routes to on-demand pages', () => {
    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Open citizen reporting when you are ready/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Report an issue/i })).toHaveAttribute(
      'href',
      '/app/citizen/report',
    );
    expect(
      screen.getByText(/sign-in can finish without waking the operational API/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Impact & History/i })).toHaveAttribute(
      'href',
      '/app/citizen/profile',
    );
  });

  it('keeps the shared workspace host behavior for non-citizen roles', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: {
        id: 'manager-1',
        displayName: 'Manager User',
        email: 'manager@example.com',
        avatarUrl: null,
        role: 'manager',
        roles: [{ id: 'role-manager', name: 'manager' }],
        isActive: true,
        provider: 'local',
      },
      isAuthenticated: true,
      isLoading: false,
      authState: 'authenticated',
      error: null,
    });

    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Enter the right EcoTrack lane\./i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Open citizen reporting when you are ready/i }),
    ).not.toBeInTheDocument();
  });
});
