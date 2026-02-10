import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.constants.js';
import { type DatabaseClient, tickets } from 'react-app1-database';

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async checkDatabase() {
    try {
      await this.db.select({ id: tickets.id }).from(tickets).limit(1);
      return { status: 'ok' as const };
    } catch (error) {
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}
