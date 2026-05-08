import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEscritorioAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string | null;
}
