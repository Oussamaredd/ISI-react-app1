import { IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpsertGamificationProfileDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsArray()
  badges?: string[];
}
