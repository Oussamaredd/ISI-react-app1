import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class OptimizeTourDto {
  @IsUUID()
  zoneId!: string;

  @IsDateString()
  scheduledFor!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  fillThresholdPercent!: number;

  @IsOptional()
  @IsUUID(undefined, { each: true })
  manualContainerIds?: string[];
}
