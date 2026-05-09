import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ThrottlePresets } from '../common/throttle-presets';
import { Public } from '../common/metadata';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { CadastroEscritorioDto } from './dto/cadastro-escritorio.dto';
import { LoginDto } from './dto/login.dto';
import { RecuperarSenhaDto } from './dto/recuperar-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { COOKIE_REFRESH } from '../common/constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Usuário autenticado (JWT). Útil para UI: perfil, modo leitura, etc. */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Public()
  @Throttle(ThrottlePresets.authLogin)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.senha);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Throttle(ThrottlePresets.authRefresh)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[COOKIE_REFRESH];
    if (!raw || typeof raw !== 'string') {
      return { ok: false };
    }
    const result = await this.auth.refresh(raw);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
      ok: true,
    };
  }

  @Public()
  @Throttle(ThrottlePresets.authCadastroEscritorio)
  @Post('cadastro-escritorio')
  async cadastroEscritorio(
    @Body() dto: CadastroEscritorioDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.cadastrarEscritorio(dto);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Throttle(ThrottlePresets.authRecuperarSenha)
  @Post('recuperar-senha')
  recuperarSenha(@Body() dto: RecuperarSenhaDto) {
    return this.auth.solicitarRecuperarSenha(dto.email);
  }

  @Public()
  @Throttle(ThrottlePresets.authRedefinirSenha)
  @Post('redefinir-senha')
  redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.auth.redefinirSenha(dto.token, dto.novaSenha);
  }

  @Public()
  @Throttle(ThrottlePresets.authLogout)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[COOKIE_REFRESH];
    await this.auth.logout(typeof raw === 'string' ? raw : undefined);
    this.auth.clearAuthCookies(res);
    return { ok: true };
  }
}
