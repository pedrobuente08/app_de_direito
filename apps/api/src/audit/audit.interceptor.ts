import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AuditService } from './audit.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      route?: { path?: string };
      body?: unknown;
      params?: Record<string, string>;
      query?: unknown;
      user?: AuthUser;
      ip?: string;
    }>();

    if (!MUTATING.has(req.method)) {
      return next.handle();
    }

    const routePath = req.route?.path ?? req.path;
    if (
      routePath?.includes('/auth/login') ||
      routePath?.includes('/auth/refresh') ||
      routePath?.includes('/admin/auth') ||
      routePath?.includes('/comunicacoes/webhook')
    ) {
      return next.handle();
    }

    const user = req.user;
    const escritorioId = user?.escritorioId ?? null;
    const usuarioId = user?.userId ?? null;

    return next.handle().pipe(
      tap(() => {
        const body =
          typeof req.body === 'object' && req.body !== null
            ? (JSON.parse(JSON.stringify(req.body)) as Record<string, unknown>)
            : undefined;
        if (body && typeof body === 'object') {
          if ('senha' in body) {
            body.senha = '[redacted]';
          }
          if ('novaSenha' in body) {
            body.novaSenha = '[redacted]';
          }
        }
        const diff: Record<string, unknown> = {
          path: req.path,
          method: req.method,
          params: req.params,
          body,
        };
        const entidadeId =
          req.params?.id ??
          req.params?.processoId ??
          req.params?.historicoId ??
          '—';

        void this.audit.registrar({
          escritorioId,
          usuarioId,
          entidade: routePath?.split('/').filter(Boolean).slice(0, 2).join('/') || 'http',
          entidadeId: String(entidadeId).slice(0, 50),
          acao: req.method,
          diff,
          ip: req.ip,
        });
      }),
    );
  }
}
