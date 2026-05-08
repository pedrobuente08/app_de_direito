import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { ImportAudienciasCsvDto } from './dto/import-audiencias-csv.dto';
import { ImportPendenciasCsvDto } from './dto/import-pendencias-csv.dto';
import { ImportProcessosCsvDto } from './dto/import-processos-csv.dto';
import { ImportacaoService } from './importacao.service';

@Controller('import')
export class ImportacaoController {
  constructor(private readonly importacao: ImportacaoService) {}

  @Post('processos')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.importProcessos)
  importarProcessos(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportProcessosCsvDto,
  ) {
    return this.importacao.importarProcessosCsv(user.escritorioId, dto.csv);
  }

  @Post('pendencias')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.importPendencias)
  importarPendencias(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportPendenciasCsvDto,
  ) {
    return this.importacao.importarPendenciasCsv(user.escritorioId, dto.csv);
  }

  @Post('audiencias')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.importAudiencias)
  importarAudiencias(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportAudienciasCsvDto,
  ) {
    return this.importacao.importarAudienciasCsv(user.escritorioId, dto.csv);
  }
}
