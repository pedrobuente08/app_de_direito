import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEscritorioAdversarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  nomeCanonico!: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cnpj?: string | null;
}
