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

  @IsIn(['SEM_CUSTAS', 'COM_CUSTAS', 'COM_MA_FE'])
  modalidade!: 'SEM_CUSTAS' | 'COM_CUSTAS' | 'COM_MA_FE';

  @IsString()
  @MaxLength(100)
  motivo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacao?: string | null;
}
