import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from './analytics.repository.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getSummary() {
    return this.repository.getSummary();
  }
}
