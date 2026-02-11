import { Injectable } from '@nestjs/common';

import { HotelsRepository } from './hotels.repository.js';

@Injectable()
export class HotelsService {
  constructor(private readonly hotelsRepository: HotelsRepository) {}

  async findAll() {
    return this.hotelsRepository.findAll();
  }
}
