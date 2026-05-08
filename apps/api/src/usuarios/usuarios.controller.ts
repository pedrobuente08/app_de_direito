import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @Throttle(ThrottlePresets.usuariosList)
  listar(@CurrentUser() user: AuthUser) {
    return this.usuarios.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.usuariosPost)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateUsuarioDto) {
    return this.usuarios.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.usuariosPatch)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuarios.atualizar(user.escritorioId, id, dto, user.userId);
  }
}
