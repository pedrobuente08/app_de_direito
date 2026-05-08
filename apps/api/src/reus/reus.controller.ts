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
import { AddAliasesDto } from './dto/add-aliases.dto';
import { CreateReuDto } from './dto/create-reu.dto';
import { MergeReuDto } from './dto/merge-reu.dto';
import { SugerirMergeDto } from './dto/sugerir-merge.dto';
import { UpdateReuDto } from './dto/update-reu.dto';
import { ReusService } from './reus.service';

@Controller('reus')
export class ReusController {
  constructor(private readonly reus: ReusService) {}

  @Post('sugerir-merge')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.reusPost)
  sugerirMerge(
    @CurrentUser() user: AuthUser,
    @Body() dto: SugerirMergeDto,
  ) {
    return this.reus.sugerirMerge(user.escritorioId, dto.texto);
  }

  @Post('merge')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.reusMerge)
  merge(@CurrentUser() user: AuthUser, @Body() dto: MergeReuDto) {
    return this.reus.merge(user.escritorioId, dto);
  }

  @Get()
  @Throttle(ThrottlePresets.reusList)
  listar(@CurrentUser() user: AuthUser) {
    return this.reus.listar(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.reusPost)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateReuDto) {
    return this.reus.criar(user.escritorioId, dto);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.reusPatch)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReuDto,
  ) {
    return this.reus.atualizar(user.escritorioId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.reusDelete)
  remover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reus.remover(user.escritorioId, id);
  }

  @Post(':id/aliases')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.reusPost)
  addAliases(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAliasesDto,
  ) {
    return this.reus.addAliases(user.escritorioId, id, dto);
  }
}
