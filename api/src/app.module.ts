import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validateEnv } from './config/validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HotelsModule } from './hotels/hotels.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AdminModule } from './admin/admin.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';

const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    TicketsModule,
    HotelsModule,
    DashboardModule,
    AdminModule,
    MonitoringModule,
  ],
})
export class AppModule {}
