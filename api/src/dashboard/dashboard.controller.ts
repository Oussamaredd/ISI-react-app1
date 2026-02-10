import { Controller, Get, Inject, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';

@Controller('dashboard')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
@RequirePermissions('tickets.read')
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  async getDashboard() {
    try {
      return await this.dashboardService.getDashboard();
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      throw new InternalServerErrorException('Unable to fetch dashboard data');
    }
  }
}
