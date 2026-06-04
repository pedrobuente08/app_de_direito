import { IsIn, IsString } from 'class-validator';

export class PatchComunicacaoStatusDto {
  @IsString()
  @IsIn(['LIDA', 'NAO_LIDA'])
  status!: 'LIDA' | 'NAO_LIDA';
}
