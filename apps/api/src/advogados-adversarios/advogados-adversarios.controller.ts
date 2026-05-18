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
import { AdvogadosAdversariosService } from './advogados-adversarios.service';
import { CreateAdvogadoAdversarioDto } from './dto/create-advogado-adversario.dto';
import { UpdateAdvogadoAdversarioDto } from './dto/update-advogado-adversario.dto';

@Controller('advogados-adversarios')
export class AdvogadosAdversariosController {
  constructor(private readonly service: AdvogadosAdversariosService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.service.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateAdvogadoAdversarioDto) {
    return this.service.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdvogadoAdversarioDto,
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
