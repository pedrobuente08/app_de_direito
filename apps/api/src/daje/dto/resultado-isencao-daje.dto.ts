import { IsIn } from 'class-validator';

export class ResultadoIsencaoDajeDto {
  @IsIn(['DEFERIDA', 'INDEFERIDA'])
  resultado!: 'DEFERIDA' | 'INDEFERIDA';
}
