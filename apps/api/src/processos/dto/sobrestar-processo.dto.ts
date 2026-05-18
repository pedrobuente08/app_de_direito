import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class SobrestarProcessoDto {
  @IsString()
  @IsNotEmpty()
  motivo!: string;

  @IsDateString()
  sobrestadoDesde!: string;
}
