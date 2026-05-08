import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CadastroEscritorioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nomeEscritorio!: string;

  /** Opcional; 14 dígitos ou formato brasileiro. */
  @ValidateIf((o: CadastroEscritorioDto) => Boolean(o.cnpj?.trim()))
  @IsString()
  @Matches(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message:
      'CNPJ inválido — use 14 dígitos ou o formato XX.XXX.XXX/XXXX-XX.',
  })
  cnpj?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nomeAdmin!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;
}
