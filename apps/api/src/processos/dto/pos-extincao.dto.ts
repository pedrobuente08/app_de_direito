import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PosExtincaoDto {
  @IsUUID('4')
  sentencaId!: string;

  @IsIn([
    'SEM_CUSTAS',
    'COM_CUSTAS',
    'COM_MA_FE',
    'DESISTENCIA_SEM_ONUS',
    'DESISTENCIA_COM_ONUS',
    'RENUNCIA_DIREITO',
  ])
  modalidade!:
    | 'SEM_CUSTAS'
    | 'COM_CUSTAS'
    | 'COM_MA_FE'
    | 'DESISTENCIA_SEM_ONUS'
    | 'DESISTENCIA_COM_ONUS'
    | 'RENUNCIA_DIREITO';

  @IsString()
  @MaxLength(100)
  motivo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;
}
