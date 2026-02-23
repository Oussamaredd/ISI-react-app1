import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';

import { UpsertGamificationProfileDto } from './dto/upsert-gamification-profile.dto.js';
import { GamificationService } from './gamification.service.js';

@Controller('gamification')
export class GamificationController {
  constructor(
    @Inject(GamificationService) private readonly gamificationService: GamificationService,
  ) {}

  @Get('leaderboard')
  async leaderboard(@Query('limit') limitParam?: string) {
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;

    const leaderboard = await this.gamificationService.getLeaderboard(limit);
    return {
      leaderboard,
      limit,
    };
  }

  @Post('profiles')
  async upsertProfile(@Body() dto: UpsertGamificationProfileDto) {
    return this.gamificationService.upsertProfile(dto);
  }
}
