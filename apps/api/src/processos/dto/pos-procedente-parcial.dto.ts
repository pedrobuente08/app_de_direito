import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class PosProcedenteParcialDto {
  @IsUUID('4')
  sentencaId!: string;

  @IsIn(['RECORRER_PARA_MAJORAR', 'NAO_RECORRER', 'AVALIAR'])
  decisao!: 'RECORRER_PARA_MAJORAR' | 'NAO_RECORRER' | 'AVALIAR';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  valorConcedido?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  valorPedido?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  responsavel?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  prazoDias?: number;
}
