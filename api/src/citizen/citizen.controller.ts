import {
  Body,
  Controller,
  Get,
  UnauthorizedException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { parsePaginationParams } from '../common/http/pagination.js';

import { CitizenService } from './citizen.service.js';
import { CreateCitizenReportDto } from './dto/create-citizen-report.dto.js';
import { UpdateChallengeProgressDto } from './dto/update-challenge-progress.dto.js';

@Controller('citizen')
@UseGuards(AuthenticatedUserGuard)
export class CitizenController {
  constructor(private readonly citizenService: CitizenService) {}

  @Post('reports')
  async createReport(@Req() request: RequestWithAuthUser, @Body() dto: CreateCitizenReportDto) {
    return this.citizenService.createReport(this.requireUserId(request), dto);
  }

  @Get('profile')
  async profile(@Req() request: RequestWithAuthUser) {
    return this.citizenService.getProfile(this.requireUserId(request));
  }

  @Get('history')
  async history(
    @Req() request: RequestWithAuthUser,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ) {
    const pagination = parsePaginationParams(pageParam, pageSizeParam);
    const { items, total } = await this.citizenService.getHistory(
      this.requireUserId(request),
      pagination.limit,
      pagination.offset,
    );

    return {
      history: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Get('challenges')
  async challenges(@Req() request: RequestWithAuthUser) {
    const items = await this.citizenService.listChallenges(this.requireUserId(request));
    return { challenges: items };
  }

  @Post('challenges/:id/enroll')
  async enroll(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
  ) {
    return this.citizenService.enrollInChallenge(this.requireUserId(request), challengeId);
  }

  @Post('challenges/:id/progress')
  async progress(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) challengeId: string,
    @Body() dto: UpdateChallengeProgressDto,
  ) {
    return this.citizenService.updateChallengeProgress(
      this.requireUserId(request),
      challengeId,
      dto.progressDelta,
    );
  }

  private requireUserId(request: RequestWithAuthUser) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}
