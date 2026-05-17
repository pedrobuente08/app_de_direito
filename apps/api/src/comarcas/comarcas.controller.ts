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
import { ComarcasService } from './comarcas.service';
import { CreateComarcaDto } from './dto/create-comarca.dto';
import { UpdateComarcaDto } from './dto/update-comarca.dto';

@Controller('comarcas')
export class ComarcasController {
  constructor(private readonly comarcas: ComarcasService) {}

  @Get()
  @Throttle(ThrottlePresets.comarcasList)
  listar(@CurrentUser() user: AuthUser) {
    return this.comarcas.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.comarcasWrite)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateComarcaDto) {
    return this.comarcas.criar(user.escritorioId, dto);
  }

  @Post('seed-padrao-ba')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.comarcasWrite)
  seedPadraoBa(@CurrentUser() user: AuthUser) {
    return this.comarcas.seedPadraoBa(user.escritorioId);
  }

  @Patch(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.comarcasWrite)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComarcaDto,
  ) {
    return this.comarcas.atualizar(user.escritorioId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.comarcasWrite)
  remover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comarcas.remover(user.escritorioId, id);
  }
}
