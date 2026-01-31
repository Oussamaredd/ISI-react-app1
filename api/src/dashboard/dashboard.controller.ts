import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
