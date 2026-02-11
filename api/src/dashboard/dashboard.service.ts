import { Injectable } from '@nestjs/common';

import { DashboardRepository, type DashboardResponse } from './dashboard.repository.js';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getDashboard(): Promise<DashboardResponse> {
    return this.dashboardRepository.getDashboard();
  }
}
