import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCitizenChallenges, useEnrollInChallenge, useUpdateChallengeProgress } from '../hooks/useCitizen';
import CitizenChallengesPage from '../pages/CitizenChallengesPage';
import { renderWithProviders } from './test-utils';

vi.mock('../hooks/useCitizen', () => ({
  useCitizenChallenges: vi.fn(),
  useEnrollInChallenge: vi.fn(),
  useUpdateChallengeProgress: vi.fn(),
}));

describe('CitizenChallengesPage', () => {
  const enrollMutate = vi.fn();
  const progressMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCitizenChallenges).mockReturnValue({
      data: {
        challenges: [
          {
            id: '8662a4a2-52fd-4423-b4a4-cd6d74bad487',
            title: 'Neighborhood Hero',
            description: 'Submit 5 validated reports this month.',
            targetValue: 5,
            rewardPoints: 100,
            enrollmentStatus: 'not_enrolled',
            progress: 0,
            completionPercent: 0,
          },
          {
            id: '2c545cba-ad55-4b8d-a3ad-eb1062734dad',
            title: 'Daily Recycler',
            description: 'Complete daily reporting streak.',
            targetValue: 10,
            rewardPoints: 150,
            enrollmentStatus: 'enrolled',
            progress: 3,
            completionPercent: 30,
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useCitizenChallenges>);

    vi.mocked(useEnrollInChallenge).mockReturnValue({
      mutate: enrollMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useEnrollInChallenge>);

    vi.mocked(useUpdateChallengeProgress).mockReturnValue({
      mutate: progressMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateChallengeProgress>);
  });

  it('enrolls and updates progress through challenge actions', async () => {
    renderWithProviders(<CitizenChallengesPage />, {
      route: '/app/citizen/challenges',
      withAuthProvider: false,
    });

    expect(await screen.findByRole('heading', { name: /Collective Challenges/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Join Challenge/i }));
    expect(enrollMutate).toHaveBeenCalledWith('8662a4a2-52fd-4423-b4a4-cd6d74bad487');

    fireEvent.click(screen.getByRole('button', { name: /Add Progress \+1/i }));
    expect(progressMutate).toHaveBeenCalledWith({
      challengeId: '2c545cba-ad55-4b8d-a3ad-eb1062734dad',
      progressDelta: 1,
    });
  });
});
