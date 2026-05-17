import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAusenteDto {
  @IsOptional()
  @IsBoolean()
  reaproveitavel?: boolean;

  @IsOptional()
  @IsDateString()
  reaproveitadoEm?: string | null;

  @IsOptional()
  @IsString()
  observacoesRevisao?: string | null;
}
