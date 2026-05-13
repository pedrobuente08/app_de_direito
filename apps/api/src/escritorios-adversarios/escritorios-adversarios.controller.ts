import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CreateEscritorioAdversarioDto } from './dto/create-escritorio-adversario.dto';
import { EscritoriosAdversariosService } from './escritorios-adversarios.service';

@Controller('escritorios-adversarios')
export class EscritoriosAdversariosController {
  constructor(
    private readonly escritoriosAdversarios: EscritoriosAdversariosService,
  ) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.escritoriosAdversarios.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEscritorioAdversarioDto,
  ) {
    return this.escritoriosAdversarios.criar(user.escritorioId, dto);
  }
}
