import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  loginAliases?: string[];

  @IsIn(['admin', 'adm', 'advogado', 'pautista', 'atendimento', 'leitura'])
  perfil!:
    | 'admin'
    | 'adm'
    | 'advogado'
    | 'pautista'
    | 'atendimento'
    | 'leitura';

  /** Marca advogado (etc.) que também conduz audiências. Ignorado se perfil = pautista (sempre true). */
  @IsOptional()
  @IsBoolean()
  ehPautista?: boolean;
}
