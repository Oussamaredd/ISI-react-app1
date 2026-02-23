import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { CitizenController } from './citizen.controller.js';
import { CitizenRepository } from './citizen.repository.js';
import { CitizenService } from './citizen.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CitizenController],
  providers: [CitizenRepository, CitizenService],
})
export class CitizenModule {}
