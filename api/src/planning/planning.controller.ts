import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';

import { CreatePlannedTourDto } from './dto/create-planned-tour.dto.js';
import { GenerateReportDto } from './dto/generate-report.dto.js';
import { OptimizeTourDto } from './dto/optimize-tour.dto.js';
import { TriggerEmergencyCollectionDto } from './dto/trigger-emergency-collection.dto.js';
import { PlanningService } from './planning.service.js';

@Controller('planning')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
export class PlanningController {
  constructor(@Inject(PlanningService) private readonly planningService: PlanningService) {}

  @Get('zones')
  @RequirePermissions('ecotrack.zones.read')
  async zones() {
    return { zones: await this.planningService.listZones() };
  }

  @Get('agents')
  @RequirePermissions('users.read')
  async agents() {
    return { agents: await this.planningService.listAgents() };
  }

  @Post('optimize-tour')
  @RequirePermissions('ecotrack.tours.write')
  async optimizeTour(@Body() dto: OptimizeTourDto) {
    return this.planningService.optimizeTour(dto);
  }

  @Post('create-tour')
  @RequirePermissions('ecotrack.tours.write')
  async createTour(@Req() request: RequestWithAuthUser, @Body() dto: CreatePlannedTourDto) {
    return this.planningService.createPlannedTour(dto, this.requireUserId(request));
  }

  @Get('dashboard')
  @RequirePermissions('ecotrack.analytics.read')
  async dashboard() {
    return this.planningService.getManagerDashboard();
  }

  @Post('emergency-collection')
  @RequirePermissions('ecotrack.tours.write')
  async triggerEmergency(
    @Req() request: RequestWithAuthUser,
    @Body() dto: TriggerEmergencyCollectionDto,
  ) {
    return this.planningService.triggerEmergencyCollection(dto, this.requireUserId(request));
  }

  @Post('reports/generate')
  @RequirePermissions('ecotrack.analytics.read')
  async generateReport(@Req() request: RequestWithAuthUser, @Body() dto: GenerateReportDto) {
    return this.planningService.generateReport(dto, this.requireUserId(request));
  }

  @Get('reports/history')
  @RequirePermissions('ecotrack.analytics.read')
  async reportHistory() {
    return { reports: await this.planningService.listReportHistory() };
  }

  @Get('reports/:id/download')
  @RequirePermissions('ecotrack.analytics.read')
  async downloadReport(
    @Param('id', new ParseUUIDPipe()) reportId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const report = await this.planningService.getReportById(reportId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);

    return report.fileContent;
  }

  @Post('reports/:id/regenerate')
  @RequirePermissions('ecotrack.analytics.read')
  async regenerateReport(
    @Req() request: RequestWithAuthUser,
    @Param('id', new ParseUUIDPipe()) reportId: string,
  ) {
    return this.planningService.regenerateReport(reportId, this.requireUserId(request));
  }

  private requireUserId(request: RequestWithAuthUser) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return userId;
  }
}
