import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsOptional()
  @Length(3, 200)
  title?: string;

  @IsString()
  @IsOptional()
  @Length(3, 200)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  requesterId?: string;

  @IsUUID()
  @IsOptional()
  hotelId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsIn(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';
}
