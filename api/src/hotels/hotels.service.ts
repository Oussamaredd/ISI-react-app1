import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants.js';
import { type DatabaseClient, hotels } from '#database';

@Injectable()
export class HotelsService {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async findAll() {
    return this.db.select().from(hotels).orderBy(asc(hotels.name));
  }
}
