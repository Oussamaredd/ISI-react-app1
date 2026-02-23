import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';

import { normalizeSearchTerm, parsePaginationParams } from '../common/http/pagination.js';

import { CreateZoneDto } from './dto/create-zone.dto.js';
import { UpdateZoneDto } from './dto/update-zone.dto.js';
import { ZonesService } from './zones.service.js';

@Controller('zones')
export class ZonesController {
  constructor(@Inject(ZonesService) private readonly zonesService: ZonesService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('isActive') isActiveParam?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = parsePaginationParams(page, pageSize);
    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const { items, total } = await this.zonesService.list({
      search: normalizeSearchTerm(q),
      isActive,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      zones: items,
      pagination: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasNext: pagination.offset + pagination.limit < total,
      },
    };
  }

  @Post()
  async create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }
}
