import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('apenasNaoLidas') apenasNaoLidas?: string,
  ) {
    return this.service.listar(user.escritorioId, {
      usuarioId: user.userId,
      apenasNaoLidas: apenasNaoLidas === '1' || apenasNaoLidas === 'true',
    });
  }

  @Patch(':id/lida')
  @Throttle(ThrottlePresets.processoPatch)
  marcarLida(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.marcarLida(user.escritorioId, id);
  }

  @Post('marcar-todas-lidas')
  @Throttle(ThrottlePresets.processoPatch)
  marcarTodas(@CurrentUser() user: AuthUser) {
    return this.service.marcarTodasLidas(user.escritorioId, user.userId);
  }
}
