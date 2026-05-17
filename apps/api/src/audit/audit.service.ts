import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { auditLog } from '../db/schema/audit-log';

export type ListAuditLogQuery = {
  page?: number;
  limit?: number;
  entidade?: string;
  usuarioId?: string;
  desde?: string;
  ate?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string, query: ListAuditLogQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = (page - 1) * limit;
    const filters = [eq(auditLog.escritorioId, escritorioId)];
    if (query.entidade?.trim()) {
      filters.push(ilike(auditLog.entidade, `%${query.entidade.trim()}%`));
    }
    if (query.usuarioId?.trim()) {
      filters.push(eq(auditLog.usuarioId, query.usuarioId.trim()));
    }
    if (query.desde?.trim()) {
      filters.push(gte(auditLog.createdAt, new Date(`${query.desde.trim()}T00:00:00Z`)));
    }
    if (query.ate?.trim()) {
      filters.push(lte(auditLog.createdAt, new Date(`${query.ate.trim()}T23:59:59Z`)));
    }
    const whereClause = and(...filters);
    const db = this.drizzle.db;
    const [totalRow] = await db
      .select({ c: count() })
      .from(auditLog)
      .where(whereClause);
    const rows = await db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);
    const total = totalRow?.c ?? 0;
    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async registrar(input: {
    escritorioId?: string | null;
    usuarioId?: string | null;
    entidade: string;
    entidadeId: string;
    acao: string;
    diff?: Record<string, unknown>;
    ip?: string | null;
  }) {
    await this.drizzle.db.insert(auditLog).values({
      escritorioId: input.escritorioId ?? null,
      usuarioId: input.usuarioId ?? null,
      entidade: input.entidade.slice(0, 50),
      entidadeId: input.entidadeId.slice(0, 50),
      acao: input.acao.slice(0, 20),
      diff: input.diff ?? null,
      ip: input.ip?.slice(0, 45) ?? null,
    });
  }
}
