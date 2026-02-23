import { Module } from '@nestjs/common';

import { ContainersController } from './containers.controller.js';
import { ContainersRepository } from './containers.repository.js';
import { ContainersService } from './containers.service.js';

@Module({
  controllers: [ContainersController],
  providers: [ContainersRepository, ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}
