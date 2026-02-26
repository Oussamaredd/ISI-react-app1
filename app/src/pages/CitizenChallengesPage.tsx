import {
  useCitizenChallenges,
  useEnrollInChallenge,
  useUpdateChallengeProgress,
} from "../hooks/useCitizen";
import "../styles/OperationsPages.css";

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

  const challengeRows = Array.isArray(
    (challengesQuery.data as { challenges?: unknown[] } | undefined)?.challenges,
  )
    ? (((challengesQuery.data as { challenges: ChallengeCard[] }).challenges) ?? [])
    : [];

  if (challengesQuery.isLoading) {
    return (
      <section className="ops-page">
        <p className="ops-status ops-status-success">Loading challenges...</p>
      </section>
    );
  }

  return (
    <section className="ops-page">
      <header className="ops-hero">
        <h1>Collective Challenges</h1>
        <p>
          Join city initiatives, track your progress, and unlock community
          rewards.
        </p>
      </header>

      <div className="ops-grid ops-grid-2">
        {challengeRows.length === 0 ? (
          <p className="ops-empty">No active challenges available right now.</p>
        ) : (
          challengeRows.map((challenge) => {
            const isEnrolled = challenge.enrollmentStatus !== "not_enrolled";
            const isCompleted = challenge.enrollmentStatus === "completed";

            return (
              <article key={challenge.id} className="ops-card ops-form">
                <div>
                  <h2>{challenge.title}</h2>
                  <p className="ops-card-intro">{challenge.description}</p>
                </div>

                <p className="ops-subtle">
                  Target: {challenge.targetValue} - Reward: {challenge.rewardPoints} points
                </p>

                <div className="ops-progress-track">
                  <div
                    className="ops-progress-fill"
                    style={{ width: `${Math.min(100, challenge.completionPercent)}%` }}
                  />
                </div>

                <p className="ops-subtle">
                  Progress: {challenge.progress}/{challenge.targetValue} (
                  {challenge.completionPercent}%)
                </p>

                <div className="ops-actions">
                  {!isEnrolled ? (
                    <button
                      type="button"
                      className="ops-btn ops-btn-primary"
                      onClick={() => enrollMutation.mutate(challenge.id)}
                      disabled={enrollMutation.isPending}
                    >
                      Join Challenge
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={
                        isCompleted
                          ? "ops-btn ops-btn-outline"
                          : "ops-btn ops-btn-success"
                      }
                      onClick={() =>
                        progressMutation.mutate({
                          challengeId: challenge.id,
                          progressDelta: 1,
                        })
                      }
                      disabled={progressMutation.isPending || isCompleted}
                    >
                      {isCompleted ? "Completed" : "Add Progress +1"}
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
