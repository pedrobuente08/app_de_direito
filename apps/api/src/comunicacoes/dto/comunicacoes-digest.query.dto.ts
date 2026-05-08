import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ComunicacoesDigestQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 7))
  @IsInt()
  @Min(1)
  @Max(90)
  dias?: number = 7;
}
