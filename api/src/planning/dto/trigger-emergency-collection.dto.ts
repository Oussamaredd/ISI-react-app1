import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TriggerEmergencyCollectionDto {
  @IsUUID()
  containerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;
}
