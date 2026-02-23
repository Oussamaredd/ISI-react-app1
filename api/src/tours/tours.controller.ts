import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { CreateTourDto } from './dto/create-tour.dto.js';
import { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import { UpdateTourDto } from './dto/update-tour.dto.js';
import { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { ToursService } from './tours.service.js';

@Controller('tours')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
export class ToursController {
  constructor(@Inject(ToursService) private readonly toursService: ToursService) {}

  @Get()
  @RequirePermissions('ecotrack.tours.read')
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('zoneId') zoneId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);
    const { items, total } = await this.toursService.list({
      search: normalizeSearchTerm(q),
      status: normalizeSearchTerm(status),
      zoneId,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      tours: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Get('agent/me')
  @RequirePermissions('ecotrack.tours.read')
  async getAgentTour(@Req() request: RequestWithAuthUser) {
    return this.toursService.getAgentTour(this.requireUserId(request));
  }

  @Get('anomaly-types')
  @RequirePermissions('ecotrack.tours.read')
  async anomalyTypes() {
    return { anomalyTypes: await this.toursService.listAnomalyTypes() };
  }

  @Get(':id/activity')
  @RequirePermissions('ecotrack.tours.read')
  async tourActivity(@Param('id', new ParseUUIDPipe()) id: string) {
    return { activity: await this.toursService.getTourActivity(id) };
  }

  @Post()
  @RequirePermissions('ecotrack.tours.write')
  async create(@Body() dto: CreateTourDto) {
    return this.toursService.create(dto);
  }

  @Post(':id/start')
  @RequirePermissions('ecotrack.tours.write')
  async startTour(@Req() request: RequestWithAuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.toursService.startTour(id, this.requireUserId(request));
  }

  @Post(':tourId/stops/:stopId/validate')
  @RequirePermissions('ecotrack.tours.write')
  async validateStop(
    @Req() request: RequestWithAuthUser,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
    @Param('stopId', new ParseUUIDPipe()) stopId: string,
    @Body() dto: ValidateTourStopDto,
  ) {
    return this.toursService.validateStop(tourId, stopId, this.requireUserId(request), dto);
  }

  @Post(':tourId/anomalies')
  @RequirePermissions('ecotrack.tours.write')
  async reportAnomaly(
    @Req() request: RequestWithAuthUser,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
    @Body() dto: ReportAnomalyDto,
  ) {
    return this.toursService.reportAnomaly(tourId, this.requireUserId(request), dto);
  }

  @Put(':id')
  @RequirePermissions('ecotrack.tours.write')
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTourDto) {
    return this.toursService.update(id, dto);
  }

  private requireUserId(request: RequestWithAuthUser) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return userId;
  }
}
