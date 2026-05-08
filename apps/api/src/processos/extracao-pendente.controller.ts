import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { AplicarExtracaoDto } from './dto/aplicar-extracao.dto';
import { ProcessosService } from './processos.service';

@Controller('extracao-pendente')
export class ExtracaoPendenteController {
  constructor(private readonly processos: ProcessosService) {}

  @Get()
  @Throttle(ThrottlePresets.extracaoList)
  listar(@CurrentUser() user: AuthUser) {
    return this.processos.listarExtracoesPendentes(user.escritorioId);
  }

  @Get(':id')
  @Throttle(ThrottlePresets.extracaoGet)
  obter(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.processos.obterExtracaoPendente(user.escritorioId, id);
  }

  @Post(':id/aplicar')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.extracaoAplicar)
  aplicar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AplicarExtracaoDto,
  ) {
    return this.processos.aplicarExtracaoPendente(
      user.escritorioId,
      id,
      user.userId,
      dto,
    );
  }
}
