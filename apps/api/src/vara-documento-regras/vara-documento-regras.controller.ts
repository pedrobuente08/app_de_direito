import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CreateVaraDocumentoRegraDto } from './dto/create-vara-documento-regra.dto';
import { UpdateVaraDocumentoRegraDto } from './dto/update-vara-documento-regra.dto';
import { VaraDocumentoRegrasService } from './vara-documento-regras.service';

@Controller('vara-documento-regras')
export class VaraDocumentoRegrasController {
  constructor(private readonly service: VaraDocumentoRegrasService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.service.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateVaraDocumentoRegraDto) {
    return this.service.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVaraDocumentoRegraDto,
  ) {
    return this.service.atualizar(user.escritorioId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.processoPostManual)
  remover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remover(user.escritorioId, id);
  }
}
