import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppHomePage from '../pages/AppHomePage';
import { useCurrentUser } from '../hooks/useAuth';
import { useCitizenProfile } from '../hooks/useCitizen';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('../hooks/useCitizen', () => ({
  useCitizenProfile: vi.fn(),
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

    vi.mocked(useCitizenProfile).mockReturnValue({
      data: {
        gamification: {
          points: 0,
          badges: [],
        },
        impact: {
          reportsSubmitted: 0,
          reportsResolved: 0,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCitizenProfile>);
  });

  it('prioritizes the first-run citizen onboarding lane when no reports were submitted yet', () => {
    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Complete your first valid container report/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Report an issue/i })).toHaveAttribute(
      'href',
      '/app/citizen/report',
    );
    expect(screen.getByText(/Mapped containers only/i)).toBeInTheDocument();
    expect(screen.getByText(/If something blocks you/i)).toBeInTheDocument();
  });

  it('switches to the lighter returning-citizen lane after the first report exists', () => {
    vi.mocked(useCitizenProfile).mockReturnValue({
      data: {
        gamification: {
          points: 30,
          badges: ['first_report'],
        },
        impact: {
          reportsSubmitted: 3,
          reportsResolved: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useCitizenProfile>);

    renderWithProviders(<AppHomePage />, { route: '/app', withAuthProvider: false });

    expect(
      screen.getByRole('heading', { name: /Report quickly, then follow your impact/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 reports/i)).toBeInTheDocument();
    expect(screen.getByText(/1 report/i)).toBeInTheDocument();
    expect(screen.getByText(/30 points/i)).toBeInTheDocument();
    expect(screen.getByText(/1 badge/i)).toBeInTheDocument();
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
    expect(screen.queryByText(/Complete your first valid container report/i)).not.toBeInTheDocument();
    expect(useCitizenProfile).toHaveBeenCalledWith(false);
  });
});
