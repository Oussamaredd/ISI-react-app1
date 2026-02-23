import { Injectable } from '@nestjs/common';

import type { CreatePlannedTourDto } from './dto/create-planned-tour.dto.js';
import type { GenerateReportDto } from './dto/generate-report.dto.js';
import type { OptimizeTourDto } from './dto/optimize-tour.dto.js';
import type { TriggerEmergencyCollectionDto } from './dto/trigger-emergency-collection.dto.js';
import { PlanningRepository } from './planning.repository.js';

@Injectable()
export class PlanningService {
  constructor(private readonly repository: PlanningRepository) {}

  async listZones() {
    return this.repository.listZones();
  }

  async listAgents() {
    return this.repository.listAgents();
  }

  async optimizeTour(dto: OptimizeTourDto) {
    return this.repository.optimizeTour(dto);
  }

  async createPlannedTour(dto: CreatePlannedTourDto, actorUserId: string) {
    return this.repository.createPlannedTour(dto, actorUserId);
  }

  async getManagerDashboard() {
    return this.repository.getManagerDashboard();
  }

  async triggerEmergencyCollection(dto: TriggerEmergencyCollectionDto, actorUserId: string) {
    return this.repository.triggerEmergencyCollection(dto, actorUserId);
  }

  async generateReport(dto: GenerateReportDto, actorUserId: string) {
    return this.repository.generateReport(dto, actorUserId);
  }

  async listReportHistory() {
    return this.repository.listReportHistory();
  }

  async getReportById(reportId: string) {
    return this.repository.getReportById(reportId);
  }

  async regenerateReport(reportId: string, actorUserId: string) {
    return this.repository.regenerateReport(reportId, actorUserId);
  }
}
