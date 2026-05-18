import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { ComunicacoesService } from './comunicacoes.service';
import { CadastrarOabDto } from './dto/cadastrar-oab.dto';
import { ComunicacaoWebhookDto } from './dto/comunicacao-webhook.dto';
import { ComunicacoesDigestQueryDto } from './dto/comunicacoes-digest.query.dto';
import { ResolverComunicacaoDto } from './dto/resolver-comunicacao.dto';

@Controller('comunicacoes')
export class ComunicacoesController {
  constructor(private readonly comunicacoes: ComunicacoesService) {}

  @Public()
  @Post('webhook')
  @Throttle(ThrottlePresets.comunicaWebhook)
  webhook(@Body() dto: ComunicacaoWebhookDto) {
    return this.comunicacoes.registrarWebhook(dto);
  }

  @Get('digest')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.comunicaDigest)
  digest(
    @CurrentUser() user: AuthUser,
    @Query() query: ComunicacoesDigestQueryDto,
  ) {
    return this.comunicacoes.digest(user.escritorioId, query.dias ?? 7);
  }

  @Get()
  @Throttle(ThrottlePresets.comunicaList)
  listar(@CurrentUser() user: AuthUser) {
    return this.comunicacoes.listar(user.escritorioId);
  }

  @Get('oabs')
  @Throttle(ThrottlePresets.comunicaList)
  listarOabs(@CurrentUser() user: AuthUser) {
    return this.comunicacoes.listarOabs(user.escritorioId);
  }

  @Post('oab')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.comunicaWrite)
  cadastrarOab(@CurrentUser() user: AuthUser, @Body() dto: CadastrarOabDto) {
    return this.comunicacoes.cadastrarOab(user.escritorioId, dto);
  }

  @Post(':id/resolver')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.comunicaWrite)
  resolver(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverComunicacaoDto,
  ) {
    return this.comunicacoes.resolver(user.escritorioId, id, dto);
  }
}
