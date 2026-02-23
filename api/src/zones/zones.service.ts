import { Injectable } from '@nestjs/common';

import type { CreateZoneDto } from './dto/create-zone.dto.js';
import type { UpdateZoneDto } from './dto/update-zone.dto.js';
import { ZonesRepository } from './zones.repository.js';

type ZoneListFilters = {
  search?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
};

@Injectable()
export class ZonesService {
  constructor(private readonly repository: ZonesRepository) {}

  async list(filters: ZoneListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateZoneDto) {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateZoneDto) {
    return this.repository.update(id, dto);
  }
}
