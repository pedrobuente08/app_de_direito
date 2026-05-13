import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'numero',
  'vara',
  'materia',
  'sistema',
  'clienteNome',
] as const;

export class ListProcessosQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn([...SORT_FIELDS])
  sort?: (typeof SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vara?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sistema?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ATIVO', 'SOBRESTADO', 'ARQUIVADO'])
  statusProcesso?: string;

  /** @deprecated Preferir `statusProcesso`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  situacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  faseAtual?: string;

  /** Última sentença: AUTOR (bom), REU (ruim), sem registro. */
  @IsOptional()
  @IsString()
  @IsIn(['BOA', 'RUIM', 'SEM'])
  filterUltimaSentenca?: 'BOA' | 'RUIM' | 'SEM';
}
