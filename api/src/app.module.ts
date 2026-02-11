import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import configuration from './config/configuration.js';
import { validateEnv } from './config/validation.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { HotelsModule } from './hotels/hotels.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootEnvPath = path.resolve(workspaceDir, '..', '.env');
const envFilePath = fs.existsSync(rootEnvPath) ? rootEnvPath : undefined;

if (envFilePath) {
  dotenv.config({ path: envFilePath });
}

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
