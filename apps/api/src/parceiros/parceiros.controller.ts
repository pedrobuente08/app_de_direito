import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AddonGuard } from '../addons/addons.guard';
import { RequireAddon } from '../addons/addons.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { ParceirosService } from './parceiros.service';

@Controller('parceiros')
@UseGuards(AddonGuard)
export class ParceirosController {
  constructor(private readonly parceiros: ParceirosService) {}

  @Get()
  @RequireAddon('captacao')
  @Throttle(ThrottlePresets.configRead)
  listar(@CurrentUser() user: AuthUser) {
    return this.parceiros.listar(user.escritorioId);
  }

  @Post()
  @RequireAddon('captacao')
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  criar(
    @CurrentUser() user: AuthUser,
    @Body()
    dto: {
      nome: string;
      tipo: 'PF' | 'ESCRITORIO';
      cpfCnpj?: string;
      comissaoPercentual?: string;
      corHex?: string;
    },
  ) {
    return this.parceiros.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @RequireAddon('captacao')
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.parceiros.atualizar(user.escritorioId, id, dto as never);
  }

  @Delete(':id')
  @RequireAddon('captacao')
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  remover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parceiros.remover(user.escritorioId, id);
  }

  @Get('materias')
  @RequireAddon('captacao')
  @Throttle(ThrottlePresets.configRead)
  listarMaterias(@CurrentUser() user: AuthUser) {
    return this.parceiros.listarMaterias(user.escritorioId);
  }

  @Post('materias')
  @RequireAddon('captacao')
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  criarMateria(
    @CurrentUser() user: AuthUser,
    @Body() dto: { parceiroId: string; materia: string },
  ) {
    return this.parceiros.criarMateria(user.escritorioId, dto);
  }

  @Delete('materias/:id')
  @RequireAddon('captacao')
  @Roles('admin')
  @Throttle(ThrottlePresets.configWrite)
  removerMateria(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parceiros.removerMateria(user.escritorioId, id);
  }
}
