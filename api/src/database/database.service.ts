import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createDatabaseInstance,
  type DatabaseClient,
  type DatabaseInstance,
} from '#database';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly instance: DatabaseInstance;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl =
      this.configService.get<string>('database.url') ??
      this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required to initialize the database connection.');
    }

    this.instance = createDatabaseInstance({
      url: databaseUrl,
    });
  }

  get client(): DatabaseClient {
    return this.instance.db;
  }

  async onModuleDestroy() {
    await this.instance.dispose();
  }
}
