import { IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProcedenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  familiaSituacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  situacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  recursoTipo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  recursoOrigem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  recursoResultado?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  docPendente?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  @IsOptional()
  @IsString()
  obsCurta?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataEstimadaRecebimento?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  valorRecebido?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataRecebimento?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataProtocoloAlvara?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataAlvaraExpedido?: string | null;
}
