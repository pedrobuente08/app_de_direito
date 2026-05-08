import { IsString, MaxLength, MinLength } from 'class-validator';

/** CSV simples: primeira linha cabeçalho; separador `,` (sem aspas multilinha). */
export class ImportProcessosCsvDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500_000)
  csv!: string;
}
