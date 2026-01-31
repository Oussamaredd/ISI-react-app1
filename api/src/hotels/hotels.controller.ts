import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { HotelsService } from './hotels.service.js';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

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
