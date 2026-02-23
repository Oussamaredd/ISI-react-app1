import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  citizenReports,
  containers,
  gamificationProfiles,
  type DatabaseClient,
  tours,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

@Injectable()
export class AnalyticsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getSummary() {
    const [containersCount, zonesCount, toursCount, reportsCount, gamificationProfilesCount] =
      await Promise.all([
        this.db.select({ value: sql<number>`count(*)` }).from(containers),
        this.db.select({ value: sql<number>`count(*)` }).from(zones),
        this.db.select({ value: sql<number>`count(*)` }).from(tours),
        this.db.select({ value: sql<number>`count(*)` }).from(citizenReports),
        this.db.select({ value: sql<number>`count(*)` }).from(gamificationProfiles),
      ]);

    return {
      containers: Number(containersCount[0]?.value ?? 0),
      zones: Number(zonesCount[0]?.value ?? 0),
      tours: Number(toursCount[0]?.value ?? 0),
      citizenReports: Number(reportsCount[0]?.value ?? 0),
      gamificationProfiles: Number(gamificationProfilesCount[0]?.value ?? 0),
    };
  }
}
