import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthUser } from '../common/decorators/current-user.decorator';

export type TenantContext = { escritorioId: string };

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      tenant?: TenantContext;
    }>();
    if (req.user?.escritorioId) {
      req.tenant = { escritorioId: req.user.escritorioId };
    }
    return next.handle();
  }
}
