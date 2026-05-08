import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ComunicacaoWebhookDto {
  @IsUUID('4')
  escritorioId!: string;

  /** Deve coincidir com `config.comunica_webhook_token` do escritório. */
  @IsString()
  @MaxLength(200)
  token!: string;

  @IsString()
  @MaxLength(20)
  oab!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numeroProcessoBruto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string | null;

  @IsOptional()
  @IsString()
  resumo?: string | null;

  @IsOptional()
  @IsString()
  conteudoCompleto?: string | null;

  @IsOptional()
  @IsISO8601()
  dataDisponibilizacao?: string | null;
}
