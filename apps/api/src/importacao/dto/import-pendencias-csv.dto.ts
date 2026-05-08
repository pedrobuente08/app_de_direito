import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportPendenciasCsvDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500_000)
  csv!: string;
}
