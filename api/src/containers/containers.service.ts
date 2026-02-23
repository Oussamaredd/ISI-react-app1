import { Injectable } from '@nestjs/common';

import { ContainersRepository } from './containers.repository.js';
import type { CreateContainerDto } from './dto/create-container.dto.js';
import type { UpdateContainerDto } from './dto/update-container.dto.js';

type ContainerListFilters = {
  search?: string;
  zoneId?: string;
  status?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ContainersService {
  constructor(private readonly repository: ContainersRepository) {}

  async list(filters: ContainerListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateContainerDto) {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateContainerDto) {
    return this.repository.update(id, dto);
  }
}
