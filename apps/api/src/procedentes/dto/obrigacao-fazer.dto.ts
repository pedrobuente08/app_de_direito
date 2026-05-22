import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ObrigacaoFazerDto {
  @IsString()
  @MaxLength(2000)
  descricao!: string;

  @IsOptional()
  @IsBoolean()
  cumprida?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  cumpridaEm?: string;

  @IsOptional()
  @IsBoolean()
  serasajudAcionado?: boolean;

  @IsOptional()
  @IsBoolean()
  temObrigacaoFazer?: boolean;
}
