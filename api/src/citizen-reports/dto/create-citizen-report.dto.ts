import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCitizenReportDto {
  @IsOptional()
  @IsUUID()
  containerId?: string;

  @IsOptional()
  @IsUUID()
  reporterUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
