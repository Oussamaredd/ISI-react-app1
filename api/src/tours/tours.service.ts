import { Injectable } from '@nestjs/common';

import type { CreateTourDto } from './dto/create-tour.dto.js';
import type { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import type { UpdateTourDto } from './dto/update-tour.dto.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { ToursRepository } from './tours.repository.js';

type TourListFilters = {
  search?: string;
  status?: string;
  zoneId?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ToursService {
  constructor(private readonly repository: ToursRepository) {}

  async list(filters: TourListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateTourDto) {
    return this.repository.create(dto);
  }

  async getAgentTour(agentUserId: string) {
    return this.repository.getAgentTour(agentUserId);
  }

  async startTour(tourId: string, actorUserId: string) {
    return this.repository.startTour(tourId, actorUserId);
  }

  async validateStop(tourId: string, stopId: string, actorUserId: string, dto: ValidateTourStopDto) {
    return this.repository.validateStop(tourId, stopId, actorUserId, dto);
  }

  async listAnomalyTypes() {
    return this.repository.listAnomalyTypes();
  }

  async reportAnomaly(tourId: string, actorUserId: string, dto: ReportAnomalyDto) {
    return this.repository.reportAnomaly(tourId, actorUserId, dto);
  }

  async getTourActivity(tourId: string) {
    return this.repository.getTourActivity(tourId);
  }

  async update(id: string, dto: UpdateTourDto) {
    return this.repository.update(id, dto);
  }
}
