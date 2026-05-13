import {
  IsArray,
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

  @IsIn(['admin', 'adm', 'advogado', 'leitura'])
  perfil!: 'admin' | 'adm' | 'advogado' | 'leitura';
}
