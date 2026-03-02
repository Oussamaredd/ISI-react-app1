import { IsIn, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

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
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'photoUrl must be a valid http/https URL',
    },
  )
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  @MaxLength(20)
  severity?: string;
}
