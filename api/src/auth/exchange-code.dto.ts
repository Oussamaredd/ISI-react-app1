import { IsString, MinLength } from 'class-validator';

export class ExchangeCodeDto {
  @IsString()
  @MinLength(8)
  code!: string;
}
