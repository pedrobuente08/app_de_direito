import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { PlatformJwtPayload } from './platform-jwt-payload';
import type { PlatformAuthUser } from './platform-jwt-payload';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor() {
    const secret = process.env.PLATFORM_JWT_SECRET?.trim();
    if (!secret) {
      throw new Error('PLATFORM_JWT_SECRET não configurado');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  validate(payload: PlatformJwtPayload): PlatformAuthUser {
    if (payload.typ !== 'platform') {
      throw new UnauthorizedException();
    }
    return { adminId: payload.sub, email: payload.email };
  }
}
