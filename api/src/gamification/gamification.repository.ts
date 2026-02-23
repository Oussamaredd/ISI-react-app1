import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { gamificationProfiles, type DatabaseClient, users } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { UpsertGamificationProfileDto } from './dto/upsert-gamification-profile.dto.js';

@Injectable()
export class GamificationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getLeaderboard(limit: number) {
    return this.db
      .select({
        userId: gamificationProfiles.userId,
        displayName: users.displayName,
        points: gamificationProfiles.points,
        level: gamificationProfiles.level,
        badges: gamificationProfiles.badges,
      })
      .from(gamificationProfiles)
      .innerJoin(users, eq(gamificationProfiles.userId, users.id))
      .orderBy(desc(gamificationProfiles.points))
      .limit(limit);
  }

  async upsertProfile(dto: UpsertGamificationProfileDto) {
    const [created] = await this.db
      .insert(gamificationProfiles)
      .values({
        userId: dto.userId,
        points: dto.points ?? 0,
        level: dto.level ?? 1,
        badges: dto.badges ?? [],
        challengeProgress: {},
      })
      .onConflictDoUpdate({
        target: gamificationProfiles.userId,
        set: {
          points: dto.points ?? 0,
          level: dto.level ?? 1,
          badges: dto.badges ?? [],
          updatedAt: new Date(),
        },
      })
      .returning();

    return created;
  }
}
