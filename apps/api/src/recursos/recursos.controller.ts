import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { RegistrarSegundoGrauDto } from './dto/registrar-segundo-grau.dto';
import { RecursosService } from './recursos.service';

@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursos: RecursosService) {}

  @Post('segundo-grau')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  registrarSegundoGrau(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegistrarSegundoGrauDto,
  ) {
    return this.recursos.registrarSegundoGrau(
      user.escritorioId,
      dto,
    );
  }
}
