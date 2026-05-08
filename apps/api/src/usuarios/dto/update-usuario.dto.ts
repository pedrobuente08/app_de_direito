import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string | null;

  @IsOptional()
  @IsIn(['admin', 'adm', 'advogado', 'leitura'])
  perfil?: 'admin' | 'adm' | 'advogado' | 'leitura';

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  senha?: string;
}
