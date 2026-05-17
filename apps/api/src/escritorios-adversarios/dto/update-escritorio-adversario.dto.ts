import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEscritorioAdversarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nomeCanonico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];
}
