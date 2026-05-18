import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAdvogadoAdversarioDto {
  @IsString()
  @MaxLength(300)
  nomeCanonico!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  oab?: string;

  @IsOptional()
  @IsUUID('4')
  escritorioAdversarioId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];
}
