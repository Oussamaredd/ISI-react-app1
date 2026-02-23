import { IsInt, Min } from 'class-validator';

export class UpdateChallengeProgressDto {
  @IsInt()
  @Min(1)
  progressDelta!: number;
}
