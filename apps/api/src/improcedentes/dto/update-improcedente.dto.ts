import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateImprocedenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  valorSucumbencia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  destinatarioSucumbencia?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['A_PAGAR', 'PAGO', 'SUSPENSO'])
  statusPagamento?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataPrazoPagamento?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataPagamento?: string | null;

  @IsOptional()
  @IsBoolean()
  justicaGratuita?: boolean;
}
