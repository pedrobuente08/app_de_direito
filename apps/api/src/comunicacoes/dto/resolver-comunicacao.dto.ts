import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DadosNovoProcessoDto {
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  numero!: string;

  @IsString()
  @MaxLength(20)
  sistema!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  clienteNome?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  clienteCpf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reuTexto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vara?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  materia?: string | null;
}

export class ResolverComunicacaoDto {
  @IsIn(['VINCULAR', 'NAO_E_NOSSO', 'ERRO'])
  decisao!: 'VINCULAR' | 'NAO_E_NOSSO' | 'ERRO';

  @IsOptional()
  @IsUUID('4')
  processoId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DadosNovoProcessoDto)
  dadosNovoProcesso?: DadosNovoProcessoDto;
}
