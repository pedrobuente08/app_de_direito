import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVaraDocumentoRegraDto {
  @IsString()
  @MaxLength(50)
  vara!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoDocumento?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  formatoDocumento?: string | null;

  @IsBoolean()
  aceita!: boolean;

  @IsOptional()
  @IsString()
  observacao?: string | null;
}
