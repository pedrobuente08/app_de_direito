import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CreateSentencaBodyDto } from './dto/create-sentenca-body.dto';
import { SentencasService } from './sentencas.service';

@Controller('sentencas')
export class SentencasController {
  constructor(private readonly sentencas: SentencasService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query('processoId') processoId?: string,
  ) {
    const id = processoId?.trim();
    if (!id) {
      throw new BadRequestException('Informe processoId na query string.');
    }
    return this.sentencas.listarPorProcesso(user.escritorioId, id);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateSentencaBodyDto) {
    return this.sentencas.criar(user.escritorioId, dto);
  }
}
