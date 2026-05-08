import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateComarcaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  abreviado?: string;
}
