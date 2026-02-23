import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import {
  challengeParticipations,
  challenges,
  citizenReports,
  gamificationProfiles,
  type DatabaseClient,
  users,
} from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';

const DUPLICATE_REPORT_WINDOW_HOURS = 2;
const REPORT_SUBMISSION_POINTS = 10;

@Injectable()
export class CitizenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async createReport(userId: string, dto: CreateCitizenReportDto) {
    const windowStart = new Date(Date.now() - DUPLICATE_REPORT_WINDOW_HOURS * 60 * 60 * 1000);
    const duplicate = await this.db.query.citizenReports.findFirst({
      where: and(
        eq(citizenReports.containerId, dto.containerId),
        gte(citizenReports.reportedAt, windowStart),
      ),
    });

    if (duplicate) {
      throw new ConflictException('A recent report for this container already exists.');
    }

    const { created, pointsAwarded, badges } = await this.db.transaction(async (tx) => {
      const [insertedReport] = await tx
        .insert(citizenReports)
        .values({
          containerId: dto.containerId,
          reporterUserId: userId,
          status: 'submitted',
          description: dto.description.trim(),
          photoUrl: dto.photoUrl ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
        })
        .returning();

      const [reportsCountRow] = await tx
        .select({ value: count() })
        .from(citizenReports)
        .where(eq(citizenReports.reporterUserId, userId));

      const existingProfile = await tx.query.gamificationProfiles.findFirst({
        where: eq(gamificationProfiles.userId, userId),
      });

      const currentPoints = existingProfile?.points ?? 0;
      const currentBadges = Array.isArray(existingProfile?.badges) ? existingProfile.badges : [];

      const nextBadges = [...currentBadges];
      if ((reportsCountRow?.value ?? 0) >= 1 && !nextBadges.includes('first_report')) {
        nextBadges.push('first_report');
      }
      if ((reportsCountRow?.value ?? 0) >= 10 && !nextBadges.includes('community_guardian')) {
        nextBadges.push('community_guardian');
      }

      const nextPoints = currentPoints + REPORT_SUBMISSION_POINTS;
      const nextLevel = Math.max(1, Math.floor(nextPoints / 100) + 1);

      await tx
        .insert(gamificationProfiles)
        .values({
          userId,
          points: nextPoints,
          level: nextLevel,
          badges: nextBadges,
          challengeProgress: existingProfile?.challengeProgress ?? {},
        })
        .onConflictDoUpdate({
          target: gamificationProfiles.userId,
          set: {
            points: nextPoints,
            level: nextLevel,
            badges: nextBadges,
            updatedAt: new Date(),
          },
        });

      return {
        created: insertedReport,
        pointsAwarded: REPORT_SUBMISSION_POINTS,
        badges: nextBadges,
      };
    });

    return {
      ...created,
      confirmationState: 'submitted',
      confirmationMessage: `Your report has been submitted successfully. +${pointsAwarded} points awarded.`,
      gamification: {
        pointsAwarded,
        badges,
      },
    };
  }

  async getHistory(userId: string, limit: number, offset: number) {
    const [items, totalRows] = await Promise.all([
      this.db
        .select()
        .from(citizenReports)
        .where(eq(citizenReports.reporterUserId, userId))
        .orderBy(desc(citizenReports.reportedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(citizenReports)
        .where(eq(citizenReports.reporterUserId, userId)),
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async getProfile(userId: string) {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [profile, reportTotals, resolvedTotals] = await Promise.all([
      this.db.query.gamificationProfiles.findFirst({ where: eq(gamificationProfiles.userId, userId) }),
      this.db
        .select({ value: count() })
        .from(citizenReports)
        .where(eq(citizenReports.reporterUserId, userId)),
      this.db
        .select({ value: count() })
        .from(citizenReports)
        .where(and(eq(citizenReports.reporterUserId, userId), eq(citizenReports.status, 'resolved'))),
    ]);

    const points = profile?.points ?? 0;
    const [higherScores] = await this.db
      .select({ value: count() })
      .from(gamificationProfiles)
      .where(sql`${gamificationProfiles.points} > ${points}`);

    const totalReports = reportTotals[0]?.value ?? 0;
    const resolvedReports = resolvedTotals[0]?.value ?? 0;

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      gamification: {
        points,
        level: profile?.level ?? 1,
        badges: profile?.badges ?? [],
        leaderboardPosition: (higherScores?.value ?? 0) + 1,
      },
      impact: {
        reportsSubmitted: totalReports,
        reportsResolved: resolvedReports,
        estimatedWasteDivertedKg: totalReports * 2,
        estimatedCo2SavedKg: totalReports * 1.3,
      },
    };
  }

  async listChallenges(userId: string) {
    const challengeRows = await this.db.select().from(challenges).orderBy(desc(challenges.createdAt));
    const participations = await this.db
      .select()
      .from(challengeParticipations)
      .where(eq(challengeParticipations.userId, userId));

    const participationByChallenge = new Map(participations.map((item) => [item.challengeId, item]));

    return challengeRows.map((challenge) => {
      const participation = participationByChallenge.get(challenge.id);
      const progress = participation?.progress ?? 0;
      const target = challenge.targetValue;
      const completionPercent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;

      return {
        ...challenge,
        enrollmentStatus: participation?.status ?? 'not_enrolled',
        progress,
        completionPercent,
      };
    });
  }

  async enrollInChallenge(userId: string, challengeId: string) {
    const [challenge] = await this.db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const [existing] = await this.db
      .select()
      .from(challengeParticipations)
      .where(
        and(
          eq(challengeParticipations.challengeId, challengeId),
          eq(challengeParticipations.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await this.db
      .insert(challengeParticipations)
      .values({
        challengeId,
        userId,
        progress: 0,
        status: 'enrolled',
      })
      .returning();

    return created;
  }

  async updateChallengeProgress(userId: string, challengeId: string, progressDelta: number) {
    return this.db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId))
        .limit(1);
      if (!challenge) {
        throw new NotFoundException('Challenge not found');
      }

      const [participation] = await tx
        .select()
        .from(challengeParticipations)
        .where(
          and(
            eq(challengeParticipations.challengeId, challengeId),
            eq(challengeParticipations.userId, userId),
          ),
        )
        .limit(1);

      if (!participation) {
        throw new NotFoundException('Challenge enrollment not found');
      }

      const nextProgress = participation.progress + progressDelta;
      const completed = nextProgress >= challenge.targetValue;
      const nextStatus = completed ? 'completed' : 'enrolled';
      const shouldGrantReward =
        completed && participation.status !== 'completed' && participation.rewardGrantedAt == null;

      const [updated] = await tx
        .update(challengeParticipations)
        .set({
          progress: nextProgress,
          status: nextStatus,
          rewardGrantedAt: shouldGrantReward ? new Date() : participation.rewardGrantedAt,
          updatedAt: new Date(),
        })
        .where(eq(challengeParticipations.id, participation.id))
        .returning();

      if (shouldGrantReward) {
        const currentProfile = await tx.query.gamificationProfiles.findFirst({
          where: eq(gamificationProfiles.userId, userId),
        });

        const currentBadges = Array.isArray(currentProfile?.badges) ? currentProfile.badges : [];
        const completionBadge = `challenge_${challenge.code.toLowerCase()}`;
        const nextBadges = currentBadges.includes(completionBadge)
          ? currentBadges
          : [...currentBadges, completionBadge];

        await tx
          .insert(gamificationProfiles)
          .values({
            userId,
            points: (currentProfile?.points ?? 0) + challenge.rewardPoints,
            level: currentProfile?.level ?? 1,
            badges: nextBadges,
            challengeProgress: currentProfile?.challengeProgress ?? {},
          })
          .onConflictDoUpdate({
            target: gamificationProfiles.userId,
            set: {
              points: (currentProfile?.points ?? 0) + challenge.rewardPoints,
              badges: nextBadges,
              updatedAt: new Date(),
            },
          });
      }

      return {
        challenge,
        participation: updated,
        rewardGranted: shouldGrantReward,
      };
    });
  }
}
