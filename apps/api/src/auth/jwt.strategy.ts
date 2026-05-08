import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';
import { COOKIE_ACCESS } from '../common/constants';
import type { AccessJwtPayload } from './jwt-payload';

function fromCookie(req: Request): string | null {
  const c = req?.cookies?.[COOKIE_ACCESS];
  return typeof c === 'string' ? c : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não configurado');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: AccessJwtPayload) {
    return {
      userId: payload.sub,
      escritorioId: payload.escritorioId,
      perfil: payload.perfil,
      email: payload.email,
    };
  }
}
