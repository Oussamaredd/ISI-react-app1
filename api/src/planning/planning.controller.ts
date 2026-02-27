import {
  BadRequestException,
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
import type { Request, Response } from 'express';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';

import { CreatePlannedTourDto } from './dto/create-planned-tour.dto.js';
import { GenerateReportDto } from './dto/generate-report.dto.js';
import { OptimizeTourDto } from './dto/optimize-tour.dto.js';
import { TriggerEmergencyCollectionDto } from './dto/trigger-emergency-collection.dto.js';
import { PlanningService } from './planning.service.js';
import { decodeStoredReportContent, resolveReportDownloadMeta } from './report-artifact.utils.js';

const STREAM_KEEPALIVE_INTERVAL_MS = 25_000;
const STREAM_SNAPSHOT_INTERVAL_MS = 10_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    if (dto.manualContainerIds !== undefined) {
      if (!Array.isArray(dto.manualContainerIds)) {
        throw new BadRequestException('manualContainerIds must be an array of UUID values');
      }

      const hasInvalidUuid = dto.manualContainerIds.some(
        (id) => typeof id !== 'string' || !UUID_REGEX.test(id.trim()),
      );
      if (hasInvalidUuid) {
        throw new BadRequestException('manualContainerIds must contain only UUID values');
      }
    }

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

  @Get('realtime/health')
  @RequirePermissions('ecotrack.analytics.read')
  async realtimeHealth() {
    return this.planningService.getRealtimeDiagnostics();
  }

  @Get('stream')
  @RequirePermissions('ecotrack.analytics.read')
  async stream(@Req() request: RequestWithAuthUser, @Res() response: Response) {
    this.requireUserId(request);
    this.planningService.registerSseConnection();

    let didCleanup = false;
    let unsubscribe: (() => void) | undefined;
    let keepaliveInterval: NodeJS.Timeout | undefined;
    let snapshotInterval: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (didCleanup) {
        return;
      }

      didCleanup = true;
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
      }
      if (snapshotInterval) {
        clearInterval(snapshotInterval);
      }
      if (unsubscribe) {
        unsubscribe();
      }
      this.planningService.unregisterSseConnection();
    };

    try {
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');

      if (typeof response.flushHeaders === 'function') {
        response.flushHeaders();
      }

      response.write(': connected\n\n');

      const writeEvent = (event: { id: string; event: string; data: Record<string, unknown> }) => {
        response.write(`id: ${event.id}\n`);
        response.write(`event: ${event.event}\n`);
        response.write(`data: ${JSON.stringify(event.data)}\n\n`);
        this.planningService.recordEmittedEvent(event.event);
      };

      const snapshot = await this.planningService.getRealtimeDashboardSnapshotEvent();

      const lastEventIdHeader = request.headers?.['last-event-id'];
      const lastEventIdFromHeader =
        typeof lastEventIdHeader === 'string'
          ? lastEventIdHeader
          : Array.isArray(lastEventIdHeader)
            ? lastEventIdHeader[0]
            : undefined;

      const lastEventIdFromQueryRaw = request.query?.last_event_id ?? request.query?.lastEventId;
      const lastEventIdFromQuery =
        typeof lastEventIdFromQueryRaw === 'string'
          ? lastEventIdFromQueryRaw
          : Array.isArray(lastEventIdFromQueryRaw)
            ? typeof lastEventIdFromQueryRaw[0] === 'string'
              ? lastEventIdFromQueryRaw[0]
              : undefined
            : undefined;

      const lastEventId = lastEventIdFromHeader ?? lastEventIdFromQuery;

      if (lastEventId && lastEventId.trim().length > 0) {
        const replayEvents = this.planningService.getReplayEventsAfter(lastEventId);
        for (const replayEvent of replayEvents) {
          writeEvent(replayEvent);
        }
      }

      writeEvent(snapshot);

      unsubscribe = this.planningService.subscribeRealtimeEvents((event) => {
        writeEvent(event);
      });

      keepaliveInterval = setInterval(() => {
        writeEvent(this.planningService.createKeepaliveEvent());
      }, STREAM_KEEPALIVE_INTERVAL_MS);

      snapshotInterval = setInterval(async () => {
        try {
          const periodicSnapshot = await this.planningService.getRealtimeDashboardSnapshotEvent();
          writeEvent(periodicSnapshot);
        } catch {
          // Keep stream alive even when snapshot refresh fails temporarily.
        }
      }, STREAM_SNAPSHOT_INTERVAL_MS);

      (request as Request).on('close', cleanup);
      (request as Request).on('end', cleanup);
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  @Post('stream/session')
  @RequirePermissions('ecotrack.analytics.read')
  async issueStreamSession(@Req() request: RequestWithAuthUser) {
    return this.planningService.issueStreamSession(request.authUser);
  }

  @Post(['ws-session', 'ws/session'])
  @RequirePermissions('ecotrack.analytics.read')
  async issueWebSocketSession(@Req() request: RequestWithAuthUser) {
    return this.planningService.issueWebSocketSession(request.authUser);
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
    const metadata = resolveReportDownloadMeta(report.format);
    response.setHeader('Content-Type', metadata.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.${metadata.fileExtension}"`);

    return decodeStoredReportContent(report.fileContent);
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
