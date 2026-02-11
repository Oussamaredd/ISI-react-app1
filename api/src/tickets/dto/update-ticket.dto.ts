import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';

import { CreateTicketDto } from './create-ticket.dto.js';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @IsIn(['open', 'in_progress', 'closed'])
  @IsOptional()
  status?: 'open' | 'in_progress' | 'closed';
}
