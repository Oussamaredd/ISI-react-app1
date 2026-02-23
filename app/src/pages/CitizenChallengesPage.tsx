import { useEnrollInChallenge, useCitizenChallenges, useUpdateChallengeProgress } from '../hooks/useCitizen';

type ChallengeCard = {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  enrollmentStatus: string;
  progress: number;
  completionPercent: number;
};

export default function CitizenChallengesPage() {
  const challengesQuery = useCitizenChallenges();
  const enrollMutation = useEnrollInChallenge();
  const progressMutation = useUpdateChallengeProgress();

  const challengeRows = Array.isArray((challengesQuery.data as { challenges?: unknown[] } | undefined)?.challenges)
    ? (((challengesQuery.data as { challenges: ChallengeCard[] }).challenges) ?? [])
    : [];

  return (
    <section className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Collective Challenges</h1>
        <p className="mt-2 text-sm text-gray-600">
          Join community challenges, track your progress, and unlock rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challengeRows.length === 0 ? (
          <p className="text-sm text-gray-500">No active challenges available right now.</p>
        ) : (
          challengeRows.map((challenge) => {
            const isEnrolled = challenge.enrollmentStatus !== 'not_enrolled';
            const isCompleted = challenge.enrollmentStatus === 'completed';

            return (
              <article key={challenge.id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{challenge.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
                </div>

                <p className="text-xs text-gray-500">
                  Target: {challenge.targetValue} - Reward: {challenge.rewardPoints} points
                </p>

                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, challenge.completionPercent)}%` }}
                  />
                </div>

                <p className="text-xs text-gray-600">
                  Progress: {challenge.progress}/{challenge.targetValue} ({challenge.completionPercent}%)
                </p>

                <div className="flex gap-2">
                  {!isEnrolled ? (
                    <button
                      type="button"
                      className="rounded-md bg-blue-600 text-white px-3 py-1 text-sm hover:bg-blue-700"
                      onClick={() => enrollMutation.mutate(challenge.id)}
                      disabled={enrollMutation.isPending}
                    >
                      Join Challenge
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 text-white px-3 py-1 text-sm hover:bg-emerald-700 disabled:opacity-60"
                      onClick={() => progressMutation.mutate({ challengeId: challenge.id, progressDelta: 1 })}
                      disabled={progressMutation.isPending || isCompleted}
                    >
                      {isCompleted ? 'Completed' : 'Add Progress +1'}
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
