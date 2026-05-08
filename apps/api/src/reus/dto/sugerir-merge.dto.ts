import { IsString, MaxLength, MinLength } from 'class-validator';

export class SugerirMergeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  texto!: string;
}
