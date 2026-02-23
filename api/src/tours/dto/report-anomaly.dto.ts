import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReportAnomalyDto {
  @IsUUID()
  anomalyTypeId!: string;

  @IsOptional()
  @IsUUID()
  tourStopId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;
}
