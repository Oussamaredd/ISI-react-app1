import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const AVATAR_URL_ALLOWED_PATTERN = /^(https?:\/\/|data:image\/(png|jpeg|jpg|webp);base64,)/i;

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  @Matches(AVATAR_URL_ALLOWED_PATTERN, {
    message: 'avatarUrl must be an http/https URL or supported image data URL.',
  })
  avatarUrl?: string;
}
