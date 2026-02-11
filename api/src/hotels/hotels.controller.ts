import { Controller, Get, Inject, InternalServerErrorException, UseGuards } from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';

import { HotelsService } from './hotels.service.js';

@Controller('hotels')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
@RequirePermissions('tickets.read')
export class HotelsController {
  constructor(
    @Inject(HotelsService)
    private readonly hotelsService: HotelsService,
  ) {}

  @Get()
  async findAll() {
    try {
      const hotels = await this.hotelsService.findAll();
      return { hotels, total: hotels.length };
    } catch (error) {
      console.error('Failed to fetch hotels', error);
      throw new InternalServerErrorException('Unable to fetch hotels');
    }
  }
}
