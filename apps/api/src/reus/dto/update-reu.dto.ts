import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateReuDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
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
