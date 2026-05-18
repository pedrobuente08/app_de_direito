import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const SUB_ESTADOS = [
  'AGUARDANDO_ISENCAO_CUSTAS',
  'AGUARDANDO_ANALISE',
  'AGUARDANDO_DOC_CLIENTE',
  'EM_REPROTOCOLO',
  'REPROTOCOLADO',
  'DESCARTADO',
] as const;

export class UpsertReprotocoloDto {
  @IsOptional()
  @IsIn(SUB_ESTADOS)
  subEstado?: (typeof SUB_ESTADOS)[number] | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  motivoExtincao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  modalidadeExtincao?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataExtincao?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataIsencaoPedida?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dataIsencaoResultado?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataReprotocolo?: string | null;

  @IsOptional()
  @IsUUID('4')
  processoNovoId?: string | null;

  @IsOptional()
  @IsString()
  observacoes?: string | null;
}
