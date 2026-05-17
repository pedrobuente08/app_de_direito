import { Body, Controller, Post } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { MigracaoProcedentesService } from './migracao-procedentes.service';

class PreviewComplementoDto {
  @IsArray()
  @IsString({ each: true })
  linhas!: string[];
}

@Controller('migracao-procedentes')
export class MigracaoProcedentesController {
  constructor(private readonly migracao: MigracaoProcedentesService) {}

  @Post('preview-complemento')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.dashboardRead)
  preview(
    @CurrentUser() _user: AuthUser,
    @Body() dto: PreviewComplementoDto,
  ) {
    return this.migracao.previewComplementos(dto.linhas ?? []);
  }
}
