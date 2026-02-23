import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCitizenReportDto {
  @IsUUID()
  containerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  latitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  longitude?: string;
}
