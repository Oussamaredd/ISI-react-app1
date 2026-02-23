import { Injectable } from '@nestjs/common';

import { CitizenRepository } from './citizen.repository.js';
import type { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';

@Injectable()
export class CitizenService {
  constructor(private readonly repository: CitizenRepository) {}

  async createReport(userId: string, dto: CreateCitizenReportDto) {
    return this.repository.createReport(userId, dto);
  }

  async getProfile(userId: string) {
    return this.repository.getProfile(userId);
  }

  async getHistory(userId: string, limit: number, offset: number) {
    return this.repository.getHistory(userId, limit, offset);
  }

  async listChallenges(userId: string) {
    return this.repository.listChallenges(userId);
  }

  async enrollInChallenge(userId: string, challengeId: string) {
    return this.repository.enrollInChallenge(userId, challengeId);
  }

  async updateChallengeProgress(userId: string, challengeId: string, progressDelta: number) {
    return this.repository.updateChallengeProgress(userId, challengeId, progressDelta);
  }
}
