import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListPendenciasQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['ABERTA', 'CUMPRIDA', 'AUTOR_FALECIDO', 'NAO_CUMPRIDA', 'SEM_EXITO', 'DEIXOU_DE_RESPONDER'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  origem?: string;
}
