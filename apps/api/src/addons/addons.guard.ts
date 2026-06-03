import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AddonsService } from './addons.service';
import { ADDON_KEY } from './addons.decorator';
import type { AddonKey } from './addons.types';

@Injectable()
export class AddonGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly addons: AddonsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const addon = this.reflector.get<AddonKey | undefined>(
      ADDON_KEY,
      context.getHandler(),
    );
    if (!addon) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user?.escritorioId) {
      throw new ForbiddenException('Escritório não identificado.');
    }

    if (!(await this.addons.isEnabled(user.escritorioId, addon))) {
      throw new ForbiddenException(
        `Add-on PRO "${addon}" não está ativo para este escritório.`,
      );
    }
    return true;
  }
}
