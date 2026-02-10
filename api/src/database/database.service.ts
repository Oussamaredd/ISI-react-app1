import { Injectable, OnApplicationShutdown, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createDatabaseInstance,
  type DatabaseClient,
  type DatabaseInstance,
} from 'react-app1-database';

@Injectable()
export class DatabaseService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly instance: DatabaseInstance;
  private disposed = false;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('database.url');

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

  async onApplicationShutdown() {
    await this.disposeConnection();
  }

  async onModuleDestroy() {
    await this.disposeConnection();
  }

  private async disposeConnection() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    await this.instance.dispose();
  }
}
