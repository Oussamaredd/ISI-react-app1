import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';

import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { ContainersService } from './containers.service.js';
import { CreateContainerDto } from './dto/create-container.dto.js';
import { UpdateContainerDto } from './dto/update-container.dto.js';

@Controller('containers')
export class ContainersController {
  constructor(@Inject(ContainersService) private readonly containersService: ContainersService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('zoneId') zoneId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);
    const { items, total } = await this.containersService.list({
      search: normalizeSearchTerm(q),
      zoneId,
      status: normalizeSearchTerm(status),
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      containers: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateContainerDto) {
    return this.containersService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateContainerDto) {
    return this.containersService.update(id, dto);
  }
}
