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
import { Public } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { AdminEscritoriosService } from './admin-escritorios.service';
import { CreateEscritorioAdminDto } from './dto/create-escritorio-admin.dto';
import { UpdateEscritorioAdminDto } from './dto/update-escritorio-admin.dto';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';

@Controller('admin/escritorios')
@Public()
@UseGuards(PlatformJwtAuthGuard)
export class AdminEscritoriosController {
  constructor(private readonly adminEscritorios: AdminEscritoriosService) {}

  @Get()
  @Throttle(ThrottlePresets.adminRead)
  listar() {
    return this.adminEscritorios.listar();
  }

  @Get(':id')
  @Throttle(ThrottlePresets.adminRead)
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminEscritorios.obter(id);
  }

  @Post()
  @Throttle(ThrottlePresets.adminWrite)
  criar(@Body() dto: CreateEscritorioAdminDto) {
    return this.adminEscritorios.criar(dto);
  }

  @Patch(':id')
  @Throttle(ThrottlePresets.adminWrite)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscritorioAdminDto,
  ) {
    return this.adminEscritorios.atualizar(id, dto);
  }

  @Delete(':id')
  @Throttle(ThrottlePresets.adminWrite)
  desativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminEscritorios.desativar(id);
  }
}
