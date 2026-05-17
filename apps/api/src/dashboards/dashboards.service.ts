import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia } from '../db/schema/audiencia';
import { escritorioAdversario } from '../db/schema/escritorio-adversario';
import { improcedente } from '../db/schema/improcedente';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { sentenca } from '../db/schema/sentenca';

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

  /** F4.1 — taxa de procedência por qualidade_caso (situação). */
  async qualidadeProcedencia(escritorioId: string) {
    const rows = await this.drizzle.db
      .select({
        qualidadeCaso: processo.qualidadeCaso,
        total: count(),
        procedentes: sql<number>`count(*) filter (where exists (
          select 1 from ${sentenca} s
          where s.processo_id = ${processo.id}
            and s.resultado in ('PROCEDENTE','PARCIAL','ACORDO')
        ))::int`,
      })
      .from(processo)
      .where(eq(processo.escritorioId, escritorioId))
      .groupBy(processo.qualidadeCaso);

    return rows
      .map((r) => {
        const total = Number(r.total ?? 0);
        const proc = Number(r.procedentes ?? 0);
        return {
          qualidadeCaso: r.qualidadeCaso ?? '(sem situação)',
          total,
          procedentes: proc,
          taxaProcedenciaPct:
            total > 0 ? Math.round((proc / total) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  /** F4.2 — top bancas adversárias (audiências vinculadas). */
  async topBancasAdversarias(escritorioId: string, limit = 10) {
    const rows = await this.drizzle.db
      .select({
        bancaId: escritorioAdversario.id,
        banca: escritorioAdversario.nomeCanonico,
        audiencias: count(),
        acordos: sql<number>`count(distinct ${processo.id}) filter (where exists (
          select 1 from ${sentenca} s
          where s.processo_id = ${processo.id} and s.resultado = 'ACORDO'
        ))::int`,
      })
      .from(audiencia)
      .innerJoin(
        escritorioAdversario,
        eq(audiencia.escritorioAdversarioId, escritorioAdversario.id),
      )
      .innerJoin(processo, eq(audiencia.processoId, processo.id))
      .where(eq(audiencia.escritorioId, escritorioId))
      .groupBy(escritorioAdversario.id, escritorioAdversario.nomeCanonico)
      .orderBy(desc(count()))
      .limit(limit);

    const [tempoMedio] = await this.drizzle.db
      .select({
        diasMedios: sql<number>`coalesce(avg(
          (select min(s.data)::date - ${processo.dataDistribuicao}::date
           from ${sentenca} s where s.processo_id = ${processo.id})
        ), 0)`,
      })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`${processo.dataDistribuicao} is not null`,
        ),
      );

    return {
      bancas: rows.map((r) => {
        const aud = Number(r.audiencias ?? 0);
        const ac = Number(r.acordos ?? 0);
        return {
          bancaId: r.bancaId,
          banca: r.banca,
          audiencias: aud,
          acordos: ac,
          taxaAcordoPct: aud > 0 ? Math.round((ac / aud) * 1000) / 10 : 0,
        };
      }),
      tempoMedioDiasAteSentenca: Math.round(Number(tempoMedio?.diasMedios ?? 0)),
    };
  }

  /** F4.3 — cruzamento 5D (banca × réu × matéria × vara × resultado última sentença). */
  async cruzamento5d(escritorioId: string, limit = 100) {
    const ultimaSentenca = sql<string>`(
      select s.resultado from ${sentenca} s
      where s.processo_id = ${processo.id}
      order by s.data desc nulls last, s.created_at desc nulls last
      limit 1
    )`;

    return this.drizzle.db
      .select({
        banca: sql<string>`coalesce(max(${escritorioAdversario.nomeCanonico}), '—')`,
        reuTexto: processo.reuTexto,
        materia: processo.materia,
        vara: processo.vara,
        resultado: sql<string>`coalesce(max(${ultimaSentenca}), '—')`,
        total: count(),
      })
      .from(processo)
      .leftJoin(
        audiencia,
        and(
          eq(audiencia.processoId, processo.id),
          eq(audiencia.escritorioId, escritorioId),
        ),
      )
      .leftJoin(
        escritorioAdversario,
        eq(audiencia.escritorioAdversarioId, escritorioAdversario.id),
      )
      .where(eq(processo.escritorioId, escritorioId))
      .groupBy(processo.reuTexto, processo.materia, processo.vara)
      .orderBy(desc(count()))
      .limit(limit);
  }

  /** F4.4 — passivo de sucumbência a pagar. */
  async passivoSucumbencia(escritorioId: string) {
    const [row] = await this.drizzle.db
      .select({
        totalLinhas: count(),
        valorTotal: sql<string>`coalesce(sum(${improcedente.valorSucumbencia}), 0)`,
      })
      .from(improcedente)
      .where(
        and(
          eq(improcedente.escritorioId, escritorioId),
          eq(improcedente.statusPagamento, 'A_PAGAR'),
        ),
      );

    return {
      linhasAPagar: Number(row?.totalLinhas ?? 0),
      valorTotalAPagar: row?.valorTotal ?? '0',
    };
  }

  /** F4.5 — % pendências por origem; alerta se MANUAL > 70%. */
  async pendenciasPorOrigem(escritorioId: string) {
    const rows = await this.drizzle.db
      .select({
        origem: pendencia.origem,
        total: count(),
      })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .groupBy(pendencia.origem);

    const total = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const manual = rows
      .filter((r) => (r.origem ?? '').toUpperCase().includes('MANUAL'))
      .reduce((s, r) => s + Number(r.total ?? 0), 0);
    const pctManual = total > 0 ? Math.round((manual / total) * 1000) / 10 : 0;

    return {
      totalAbertas: total,
      pctManual,
      alertaManualAlto: pctManual > 70,
      porOrigem: rows
        .map((r) => ({
          origem: r.origem ?? '—',
          total: Number(r.total ?? 0),
          pct: total > 0 ? Math.round((Number(r.total) / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }
}
