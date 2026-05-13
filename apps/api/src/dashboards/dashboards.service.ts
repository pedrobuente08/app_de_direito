import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia } from '../db/schema/audiencia';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';

@Injectable()
export class DashboardsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async porVaras(escritorioId: string, _cidade?: string) {
    void _cidade;
    const rows = await this.drizzle.db
      .select({
        vara: processo.vara,
        total: count(),
      })
      .from(processo)
      .where(eq(processo.escritorioId, escritorioId))
      .groupBy(processo.vara);

    return [...rows].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  }

  async pendenciasPorStatus(escritorioId: string) {
    return this.drizzle.db
      .select({
        status: pendencia.status,
        total: count(),
      })
      .from(pendencia)
      .where(eq(pendencia.escritorioId, escritorioId))
      .groupBy(pendencia.status);
  }

  async audienciasResumo(escritorioId: string) {
    const hoje = new Date().toISOString().slice(0, 10);
    const [ativas] = await this.drizzle.db
      .select({ total: count() })
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          gte(audiencia.data, hoje),
        ),
      );

    const [total] = await this.drizzle.db
      .select({ total: count() })
      .from(audiencia)
      .where(eq(audiencia.escritorioId, escritorioId));

    return {
      audienciasFuturas: ativas?.total ?? 0,
      audienciasCadastradas: total?.total ?? 0,
    };
  }

  async teseReuVara(
    escritorioId: string,
    materia?: string,
    reu?: string,
    vara?: string,
  ) {
    const parts = [eq(processo.escritorioId, escritorioId)];
    if (materia?.trim()) {
      parts.push(eq(processo.materia, materia.trim()));
    }
    if (vara?.trim()) {
      parts.push(eq(processo.vara, vara.trim()));
    }
    if (reu?.trim()) {
      parts.push(ilike(processo.reuTexto, `%${reu.trim()}%`));
    }

    return this.drizzle.db
      .select({
        materia: processo.materia,
        vara: processo.vara,
        reuTexto: processo.reuTexto,
        total: count(),
        procedentes: sql<number>`count(*) filter (where (
          select s.resultado from sentenca s
          where s.processo_id = ${processo.id}
          order by s.data desc nulls last, s.created_at desc nulls last
          limit 1
        ) in ('PROCEDENTE','PARCIAL','ACORDO'))::int`,
      })
      .from(processo)
      .where(and(...parts))
      .groupBy(processo.materia, processo.vara, processo.reuTexto)
      .orderBy(desc(count()))
      .limit(200);
  }
}
