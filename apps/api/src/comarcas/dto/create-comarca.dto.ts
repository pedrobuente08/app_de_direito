import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComarcaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  codigo!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nome!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  abreviado!: string;

  @IsOptional()
  @IsIn(['DILIGENTE', 'MENOS_DILIGENTE'])
  perfilDiligencia?: 'DILIGENTE' | 'MENOS_DILIGENTE';

  @IsOptional()
  @IsBoolean()
  exigeDocFrequente?: boolean;
}
