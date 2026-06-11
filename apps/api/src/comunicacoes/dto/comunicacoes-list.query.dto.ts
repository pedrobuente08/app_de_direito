import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ComunicacoesListQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 30))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 30;
}
