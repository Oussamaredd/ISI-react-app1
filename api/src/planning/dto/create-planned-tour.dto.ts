import { ArrayNotEmpty, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePlannedTourDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  zoneId!: string;

  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  orderedContainerIds!: string[];
}
