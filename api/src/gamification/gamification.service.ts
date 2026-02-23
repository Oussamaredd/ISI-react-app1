import { Injectable } from '@nestjs/common';

import type { UpsertGamificationProfileDto } from './dto/upsert-gamification-profile.dto.js';
import { GamificationRepository } from './gamification.repository.js';

@Injectable()
export class GamificationService {
  constructor(private readonly repository: GamificationRepository) {}

  async getLeaderboard(limit: number) {
    return this.repository.getLeaderboard(limit);
  }

  async upsertProfile(dto: UpsertGamificationProfileDto) {
    return this.repository.upsertProfile(dto);
  }
}
