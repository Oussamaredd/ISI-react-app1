import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CitizenProfilePage from '../pages/CitizenProfilePage';
import { useCitizenHistory, useCitizenProfile } from '../hooks/useCitizen';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useCitizen', () => ({
  useCitizenProfile: vi.fn(),
  useCitizenHistory: vi.fn(),
}));

describe('CitizenProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCitizenProfile).mockReturnValue({
      data: {
        gamification: {
          points: 120,
          level: 4,
          badges: ['first_report', 'community_guardian'],
          leaderboardPosition: 7,
        },
        impact: {
          reportsSubmitted: 9,
          reportsResolved: 6,
          estimatedWasteDivertedKg: 84,
          estimatedCo2SavedKg: 23,
        },
      },
      isLoading: false,
    } as ReturnType<typeof useCitizenProfile>);

    vi.mocked(useCitizenHistory).mockImplementation((page = 1) => {
      if (page === 2) {
        return {
          data: {
            history: [
              {
                id: 'history-2',
                containerCode: 'CTR-1002',
                containerLabel: 'Library Avenue - Plastic',
                description: 'Resolved after same-day pickup',
                status: 'resolved',
                photoUrl: 'https://example.com/resolved-photo.jpg',
                latitude: '48.8589',
                longitude: '2.3540',
                reportedAt: '2026-02-26T09:00:00.000Z',
              },
            ],
            pagination: {
              hasNext: false,
            },
          },
          isLoading: false,
        } as ReturnType<typeof useCitizenHistory>;
      }

      return {
        data: {
          history: [
            {
              id: 'history-1',
              containerCode: 'CTR-1001',
              containerLabel: 'Main Square - Glass',
              description: 'Container full near park',
              status: 'submitted',
              photoUrl: 'https://example.com/report-photo.jpg',
              latitude: '48.8566',
              longitude: '2.3522',
              reportedAt: '2026-02-24T09:00:00.000Z',
            },
          ],
          pagination: {
            hasNext: true,
          },
        },
        isLoading: false,
      } as ReturnType<typeof useCitizenHistory>;
    });
  });

  it('renders profile KPIs and navigates history pagination', async () => {
    renderWithProviders(<CitizenProfilePage />, {
      route: '/app/citizen/profile',
      withAuthProvider: false,
    });

    expect(await screen.findByRole('heading', { name: /Citizen Impact and Follow-up/i })).toBeInTheDocument();
    expect(screen.getByText('community_guardian')).toBeInTheDocument();
    expect(screen.getByText(/CTR-1001 - Main Square - Glass/i)).toBeInTheDocument();
    expect(screen.getByText(/Container full near park/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View photo evidence/i })).toHaveAttribute(
      'href',
      'https://example.com/report-photo.jpg',
    );
    expect(screen.getByText(/Location: 48\.8566, 2\.3522/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Resolved after same-day pickup/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/CTR-1002 - Library Avenue - Plastic/i)).toBeInTheDocument();

    expect(useCitizenHistory).toHaveBeenCalledWith(1, 8);
    expect(useCitizenHistory).toHaveBeenCalledWith(2, 8);
  });
});
