import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto.js';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @IsIn(['open', 'in_progress', 'closed'])
  @IsOptional()
  status?: 'open' | 'in_progress' | 'closed';
}
