import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListPendenciasQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['ABERTA', 'CUMPRIDO', 'CUMPRIDA'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  origem?: string;
}
