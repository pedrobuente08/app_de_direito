import { IsOptional, Matches, MaxLength } from 'class-validator';

export class EmitirDajeDto {
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  valor!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataEmissao?: string;

  @IsOptional()
  @MaxLength(2000)
  observacao?: string;
}
