import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { type DatabaseClient, hotels } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

@Injectable()
export class HotelsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async findAll() {
    return this.db.select().from(hotels).orderBy(asc(hotels.name));
  }
}
