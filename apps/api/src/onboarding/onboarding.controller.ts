import { Body, Controller, Get, Post } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { IniciarOnboardingDto } from './dto/iniciar-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('djen')
  @Roles('admin', 'adm')
  iniciar(@CurrentUser() user: AuthUser, @Body() dto: IniciarOnboardingDto) {
    return this.onboarding.iniciar(user.escritorioId, dto);
  }

  @Get('status')
  @Roles('admin', 'adm', 'advogado')
  status(@CurrentUser() user: AuthUser) {
    return this.onboarding.obterStatus(user.escritorioId);
  }
}
