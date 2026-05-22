import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DesistirProcessoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  motivo!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;
}
