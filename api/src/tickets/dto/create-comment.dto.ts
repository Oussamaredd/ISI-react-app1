import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  body?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  content?: string;
}
