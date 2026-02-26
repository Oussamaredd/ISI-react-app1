import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MonitoringModule } from '../monitoring/monitoring.module.js';

import { PlanningController } from './planning.controller.js';
import { PlanningGateway } from './planning.gateway.js';
import { PlanningRepository } from './planning.repository.js';
import { PlanningService } from './planning.service.js';

@Module({
  imports: [AuthModule, MonitoringModule],
  controllers: [PlanningController],
  providers: [PlanningRepository, PlanningService, PlanningGateway],
})
export class PlanningModule {}
