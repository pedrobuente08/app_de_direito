import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import axios from 'axios';
import { Public } from './common/metadata';

@Controller('health')
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get()
  health() {
    return { ok: true, service: 'conectar-api' };
  }

  /** Diagnóstico: a API consegue alcançar `SKILL_URL/health`? */
  @Public()
  @SkipThrottle()
  @Get('skill')
  async skill() {
    const raw = process.env.SKILL_URL?.trim();
    if (!raw) {
      return {
        ok: false,
        configured: false,
        hint: 'Defina SKILL_URL no apps/api/.env (ex.: http://127.0.0.1:5001)',
      };
    }
    const base = raw.replace(/\/$/, '');
    try {
      const res = await axios.get(`${base}/health`, {
        timeout: 4_000,
        validateStatus: () => true,
      });
      const ok = res.status >= 200 && res.status < 300;
      return {
        ok,
        configured: true,
        skillUrl: base,
        httpStatus: res.status,
        body: res.data,
        hint: ok
          ? undefined
          : 'Skill respondeu com erro HTTP — veja logs do terminal da skill.',
      };
    } catch (e) {
      return {
        ok: false,
        configured: true,
        skillUrl: base,
        error: (e as Error).message,
        hint: 'Não conectou (skill parada, porta errada ou firewall). Rode: npm run dev:skill',
      };
    }
  }
}
