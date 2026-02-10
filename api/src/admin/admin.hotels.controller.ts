import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from './admin.guard.js';
import { AdminUser } from './admin.decorators.js';
import type { AdminUserContext } from './admin.types.js';
import { AdminHotelsService } from './admin.hotels.service.js';
import { AdminAuditService } from './admin.audit.service.js';
import { getRequestMetadata } from './admin.utils.js';

@Controller('admin/hotels')
@UseGuards(AdminGuard)
export class AdminHotelsController {
  constructor(
    private readonly hotelsService: AdminHotelsService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async listHotels(
    @Query('search') search?: string,
    @Query('is_available') isAvailableParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    try {
      const isAvailable =
        isAvailableParam === 'true' ? true : isAvailableParam === 'false' ? false : undefined;
      const page = Number.parseInt(pageParam ?? '', 10);
      const limit = Number.parseInt(limitParam ?? '', 10);

      const result = await this.hotelsService.listHotels({
        search,
        isAvailable,
        page: Number.isFinite(page) ? page : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      return { data: result };
    } catch (error) {
      console.error('Failed to list hotels', error);
      throw new InternalServerErrorException('Unable to fetch hotels');
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.hotelsService.getStats();
      return { data: stats };
    } catch (error) {
      console.error('Failed to fetch hotel stats', error);
      throw new InternalServerErrorException('Unable to fetch hotel stats');
    }
  }

  @Get('top')
  async getTopHotels(@Query('limit') limitParam?: string) {
    try {
      const limit = Number.parseInt(limitParam ?? '', 10);
      const hotels = await this.hotelsService.getTopHotels(
        Number.isFinite(limit) ? limit : 10,
      );
      return { data: { hotels } };
    } catch (error) {
      console.error('Failed to fetch top hotels', error);
      throw new InternalServerErrorException('Unable to fetch top hotels');
    }
  }

  @Get(':id')
  async getHotel(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const hotel = await this.hotelsService.getHotel(id);
      return { data: hotel };
    } catch (error) {
      console.error('Failed to fetch hotel', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to fetch hotel');
    }
  }

  @Post()
  async createHotel(
    @Body() body: { name: string; is_available?: boolean },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const created = await this.hotelsService.createHotel(body);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'hotel_created',
        resourceType: 'hotels',
        resourceId: created.id,
        newValues: created,
        ipAddress,
        userAgent,
      });

      return { data: created };
    } catch (error) {
      console.error('Failed to create hotel', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to create hotel');
    }
  }

  @Put(':id')
  async updateHotel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { name?: string; is_available?: boolean },
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const updated = await this.hotelsService.updateHotel(id, body);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'hotel_updated',
        resourceType: 'hotels',
        resourceId: id,
        newValues: updated,
        ipAddress,
        userAgent,
      });

      return { data: updated };
    } catch (error) {
      console.error('Failed to update hotel', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update hotel');
    }
  }

  @Delete(':id')
  async deleteHotel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const deleted = await this.hotelsService.deleteHotel(id);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: 'hotel_deleted',
        resourceType: 'hotels',
        resourceId: id,
        oldValues: deleted,
        ipAddress,
        userAgent,
      });

      return { data: deleted };
    } catch (error) {
      console.error('Failed to delete hotel', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to delete hotel');
    }
  }

  @Patch(':id/toggle')
  @HttpCode(200)
  async toggleHotelAvailability(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AdminUser() adminUser: AdminUserContext,
    @Req() req: Request,
  ) {
    try {
      const { updated, message } = await this.hotelsService.toggleAvailability(id);

      const { ipAddress, userAgent } = getRequestMetadata(req);
      await this.auditService.log({
        userId: adminUser?.id,
        action: updated.isAvailable ? 'hotel_activated' : 'hotel_deactivated',
        resourceType: 'hotels',
        resourceId: id,
        newValues: { is_available: updated.isAvailable },
        ipAddress,
        userAgent,
      });

      return {
        data: {
          message,
          hotel: updated,
        },
      };
    } catch (error) {
      console.error('Failed to toggle hotel', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to toggle hotel availability');
    }
  }
}
