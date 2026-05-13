import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ConfirmarBatchItemDto {
  @IsUUID()
  itemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  numero!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  clienteCpf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reuTexto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vara?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  sistema!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  login?: string | null;

  /** `yyyy-mm-dd` ou vazio */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dataDistribuicao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dataAudiencia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  horaAudiencia?: string | null;
}

export class ConfirmarBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmarBatchItemDto)
  items!: ConfirmarBatchItemDto[];
}
