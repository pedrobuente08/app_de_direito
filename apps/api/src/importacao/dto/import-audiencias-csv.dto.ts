import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImportAudienciasCsvDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500_000)
  csv!: string;
}
