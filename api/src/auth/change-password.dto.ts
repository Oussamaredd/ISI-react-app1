import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_PATTERN, {
    message:
      'New password must include at least one uppercase letter, one lowercase letter, one number, and one symbol.',
  })
  newPassword!: string;
}
