import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia } from '../db/schema/audiencia';
import { comunicacao } from '../db/schema/comunicacao';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { escritorioAdversario } from '../db/schema/escritorio-adversario';
import { improcedente } from '../db/schema/improcedente';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { sentenca } from '../db/schema/sentenca';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    const dash = await this.pendenciasDashboard(escritorioId);
    return dash.porStatus;
  }

  /** Dashboard PENDÊNCIAS — responsável, tipo, SLA. */
  async pendenciasDashboard(escritorioId: string) {
    const hoje = hojeYmd();

    const porStatus = await this.drizzle.db
      .select({
        status: pendencia.status,
        total: count(),
      })
      .from(pendencia)
      .where(eq(pendencia.escritorioId, escritorioId))
      .groupBy(pendencia.status);

    const porResponsavel = await this.drizzle.db
      .select({
        responsavel: sql<string>`coalesce(nullif(trim(${pendencia.responsavel}), ''), '(sem responsável)')`,
        total: count(),
      })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .groupBy(
        sql`coalesce(nullif(trim(${pendencia.responsavel}), ''), '(sem responsável)')`,
      )
      .orderBy(desc(count()))
      .limit(20);

    const porTipo = await this.drizzle.db
      .select({
        tipo: pendencia.tipo,
        total: count(),
      })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .groupBy(pendencia.tipo)
      .orderBy(desc(count()))
      .limit(25);

    const [vencidasRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
          lte(pendencia.dataLimite, hoje),
        ),
      );

    const [comPrazoRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
        ),
      );

    const [semPrazoRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          isNull(pendencia.dataLimite),
        ),
      );

    const [abertasRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    const abertas = Number(abertasRow?.total ?? 0);
    const vencidas = Number(vencidasRow?.total ?? 0);

    return {
      porStatus: porStatus.map((r) => ({
        status: r.status,
        total: Number(r.total ?? 0),
      })),
      porResponsavel: porResponsavel.map((r) => ({
        responsavel: r.responsavel,
        total: Number(r.total ?? 0),
      })),
      porTipo: porTipo.map((r) => ({
        tipo: r.tipo,
        total: Number(r.total ?? 0),
      })),
      sla: {
        abertas,
        vencidas,
        comPrazo: Number(comPrazoRow?.total ?? 0),
        semPrazo: Number(semPrazoRow?.total ?? 0),
        pctVencidas:
          abertas > 0 ? Math.round((vencidas / abertas) * 1000) / 10 : 0,
      },
    };
  }

  /** Dashboard RECURSOS — provimento 2º grau, turmas. */
  async recursos(escritorioId: string) {
    const acordaos = await this.drizzle.db
      .select({
        id: sentenca.id,
        data: sentenca.data,
        resultado: sentenca.resultado,
        favoravelPara: sentenca.favoravelPara,
        turma: sentenca.turma,
        processoId: sentenca.processoId,
      })
      .from(sentenca)
      .where(
        and(
          eq(sentenca.escritorioId, escritorioId),
          eq(sentenca.grau, 'SEGUNDO_GRAU'),
        ),
      )
      .orderBy(desc(sentenca.data));

    const total = acordaos.length;
    const providos = acordaos.filter(
      (s) =>
        ['PROCEDENTE', 'PARCIAL'].includes(
          (s.resultado ?? '').trim().toUpperCase(),
        ) && (s.favoravelPara ?? '').trim().toUpperCase() === 'AUTOR',
    ).length;

    const porTurmaMap = new Map<string, number>();
    for (const s of acordaos) {
      const t = (s.turma ?? '').trim() || '(sem turma)';
      porTurmaMap.set(t, (porTurmaMap.get(t) ?? 0) + 1);
    }

    const tempos: number[] = [];
    for (const ac of acordaos.slice(0, 80)) {
      const [s1] = await this.drizzle.db
        .select({ data: sentenca.data })
        .from(sentenca)
        .where(
          and(
            eq(sentenca.processoId, ac.processoId),
            eq(sentenca.escritorioId, escritorioId),
            eq(sentenca.grau, 'PRIMEIRO_GRAU'),
          ),
        )
        .orderBy(desc(sentenca.data))
        .limit(1);
      if (s1?.data && ac.data) {
        const d1 = new Date(String(s1.data)).getTime();
        const d2 = new Date(String(ac.data)).getTime();
        if (!Number.isNaN(d1) && !Number.isNaN(d2) && d2 >= d1) {
          tempos.push(Math.round((d2 - d1) / 86_400_000));
        }
      }
    }

    const tempoMedioDiasAcordao =
      tempos.length > 0
        ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
        : 0;

    return {
      totalAcordaos: total,
      taxaProvimentoPct:
        total > 0 ? Math.round((providos / total) * 1000) / 10 : 0,
      tempoMedioDiasAcordao,
      porTurma: [...porTurmaMap.entries()]
        .map(([turma, n]) => ({ turma, total: n }))
        .sort((a, b) => b.total - a.total),
      recentes: acordaos.slice(0, 15).map((s) => ({
        data: String(s.data),
        resultado: s.resultado,
        favoravelPara: s.favoravelPara,
        turma: s.turma,
      })),
    };
  }

  /** Dashboard IMPROCEDENTES — sucumbência, AVALIAR, status pagamento. */
  async improcedentes(escritorioId: string) {
    const passivo = await this.passivoSucumbencia(escritorioId);

    const porStatus = await this.drizzle.db
      .select({
        status: improcedente.statusPagamento,
        total: count(),
        valor: sql<string>`coalesce(sum(${improcedente.valorSucumbencia}), 0)`,
      })
      .from(improcedente)
      .where(eq(improcedente.escritorioId, escritorioId))
      .groupBy(improcedente.statusPagamento);

    const processos = await this.drizzle.db
      .select({
        id: processo.id,
        numero: processo.numero,
        avaliacaoRecurso: processo.avaliacaoRecurso,
      })
      .from(processo)
      .where(eq(processo.escritorioId, escritorioId))
      .limit(2000);

    const hoje = hojeYmd();
    const avaliarLista: {
      processoId: string;
      numero: string;
      prazo: string | null;
      vencido: boolean;
    }[] = [];

    for (const p of processos) {
      const av = p.avaliacaoRecurso as { ativa?: boolean; prazo?: string } | null;
      if (!av?.ativa) continue;
      const prazo = av.prazo ?? null;
      avaliarLista.push({
        processoId: p.id,
        numero: p.numero,
        prazo,
        vencido: Boolean(prazo && prazo <= hoje),
      });
    }

    return {
      passivo,
      porStatusPagamento: porStatus.map((r) => ({
        status: r.status ?? '—',
        total: Number(r.total ?? 0),
        valor: r.valor ?? '0',
      })),
      avaliar: {
        ativos: avaliarLista.length,
        vencidos: avaliarLista.filter((a) => a.vencido).length,
        lista: avaliarLista
          .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'))
          .slice(0, 20),
      },
    };
  }

  /** Dashboard FINANCEIRO — provisão (M2 parcial: recebidos + fatores config). */
  async financeiro(escritorioId: string) {
    const [esc] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);

    const cfg = (esc?.config ?? {}) as EscritorioConfig;
    const fatores = cfg.fatores_provisao_pct ?? [60, 85, 100];

    const [recvRow] = await this.drizzle.db
      .select({
        total: count(),
        valor: sql<string>`coalesce(sum(${processoProcedente.valorRecebido}), 0)`,
      })
      .from(processoProcedente)
      .where(
        and(
          eq(processoProcedente.escritorioId, escritorioId),
          sql`${processoProcedente.valorRecebido} is not null`,
        ),
      );

    const [pendRow] = await this.drizzle.db
      .select({
        valor: sql<string>`coalesce(sum(${processoProcedente.valorRecebido}), 0)`,
      })
      .from(processoProcedente)
      .where(
        and(
          eq(processoProcedente.escritorioId, escritorioId),
          sql`${processoProcedente.familiaSituacao} in ('AGUARDAR_PAGTO', 'EXEC_ATIVA', 'PEND_INTERNA')`,
          isNull(processoProcedente.dataRecebimento),
        ),
      );

    return {
      fase: 'M1',
      mensagem:
        'Forecast trimestral completo previsto para M2. Valores abaixo usam recebimentos registrados e fatores de provisão do escritório.',
      fatoresProvisaoPct: fatores,
      recebimentos: {
        linhasComValor: Number(recvRow?.total ?? 0),
        valorTotalRecebido: recvRow?.valor ?? '0',
      },
      provisaoEscalonada: fatores.map((pct) => ({
        fatorPct: pct,
        valorEstimado: null as string | null,
      })),
      carteiraAguardandoRecebimento: pendRow?.valor ?? '0',
    };
  }

  async audienciasResumo(escritorioId: string) {
    const dash = await this.audienciasDashboard(escritorioId);
    return {
      audienciasFuturas: dash.audienciasFuturas,
      audienciasCadastradas: dash.audienciasCadastradas,
    };
  }

  /** Dashboard AUDIÊNCIAS — próximos 7d, heatmap pautista, OBS pré. */
  async audienciasDashboard(escritorioId: string) {
    const hoje = hojeYmd();
    const ate7 = addDaysYmd(hoje, 7);

    const [futurasRow] = await this.drizzle.db
      .select({ total: count() })
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          gte(audiencia.data, hoje),
        ),
      );

    const [totalRow] = await this.drizzle.db
      .select({ total: count() })
      .from(audiencia)
      .where(eq(audiencia.escritorioId, escritorioId));

    const proximos7d = await this.drizzle.db
      .select({
        id: audiencia.id,
        data: audiencia.data,
        hora: audiencia.hora,
        tipo: audiencia.tipo,
        pautista: audiencia.pautista,
        status: audiencia.status,
        processoNumero: processo.numero,
        clienteNome: processo.clienteNome,
      })
      .from(audiencia)
      .innerJoin(processo, eq(audiencia.processoId, processo.id))
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          gte(audiencia.data, hoje),
          lte(audiencia.data, ate7),
        ),
      )
      .orderBy(audiencia.data, audiencia.hora);

    const heatmapRows = await this.drizzle.db
      .select({
        pautista: sql<string>`coalesce(nullif(trim(${audiencia.pautista}), ''), '(sem pautista)')`,
        data: audiencia.data,
        total: count(),
      })
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          gte(audiencia.data, hoje),
          lte(audiencia.data, ate7),
        ),
      )
      .groupBy(
        sql`coalesce(nullif(trim(${audiencia.pautista}), ''), '(sem pautista)')`,
        audiencia.data,
      )
      .orderBy(audiencia.data);

    const [obsPreRow] = await this.drizzle.db
      .select({ total: count() })
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          gte(audiencia.data, hoje),
          lte(audiencia.data, ate7),
          eq(audiencia.status, 'AGENDADA'),
          or(isNull(audiencia.obsPre), sql`trim(${audiencia.obsPre}) = ''`),
        ),
      );

    return {
      audienciasFuturas: Number(futurasRow?.total ?? 0),
      audienciasCadastradas: Number(totalRow?.total ?? 0),
      obsPrePendentes: Number(obsPreRow?.total ?? 0),
      proximos7d: proximos7d.map((r) => ({
        id: r.id,
        data: String(r.data),
        hora: r.hora ? String(r.hora).slice(0, 5) : null,
        tipo: r.tipo,
        pautista: r.pautista,
        status: r.status,
        processoNumero: r.processoNumero,
        clienteNome: r.clienteNome,
      })),
      heatmapPautista: heatmapRows.map((r) => ({
        pautista: r.pautista,
        data: String(r.data),
        total: Number(r.total ?? 0),
      })),
    };
  }

  /** Dashboard GERAL — funil, órfãs, sem movimento. */
  async geral(escritorioId: string) {
    const funilPorFase = await this.drizzle.db
      .select({
        fase: sql<string>`coalesce(nullif(trim(${processo.faseAtual}), ''), '(sem fase)')`,
        total: count(),
      })
      .from(processo)
      .where(eq(processo.escritorioId, escritorioId))
      .groupBy(
        sql`coalesce(nullif(trim(${processo.faseAtual}), ''), '(sem fase)')`,
      )
      .orderBy(desc(count()));

    const funilPorQualidade = await this.drizzle.db
      .select({
        qualidade: sql<string>`coalesce(nullif(trim(${processo.qualidadeCaso}), ''), '(sem situação)')`,
        total: count(),
      })
      .from(processo)
      .where(eq(processo.escritorioId, escritorioId))
      .groupBy(
        sql`coalesce(nullif(trim(${processo.qualidadeCaso}), ''), '(sem situação)')`,
      )
      .orderBy(desc(count()));

    const [orfasRow] = await this.drizzle.db
      .select({ total: count() })
      .from(comunicacao)
      .where(
        and(
          eq(comunicacao.escritorioId, escritorioId),
          eq(comunicacao.status, 'ORFA'),
        ),
      );

    const limite = new Date();
    limite.setDate(limite.getDate() - 30);

    const [semMovRow] = await this.drizzle.db
      .select({ total: count() })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.statusProcesso, 'ATIVO'),
          or(
            isNull(processo.ultimaMovimentacaoDt),
            lte(processo.ultimaMovimentacaoDt, limite),
          ),
        ),
      );

    const totalProcessos = funilPorFase.reduce(
      (s, r) => s + Number(r.total ?? 0),
      0,
    );

    return {
      totalProcessos,
      comunicacoesOrfas: Number(orfasRow?.total ?? 0),
      processosSemMovimento30d: Number(semMovRow?.total ?? 0),
      funilPorFase: funilPorFase.map((r) => ({
        fase: r.fase,
        total: Number(r.total ?? 0),
      })),
      funilPorQualidade: funilPorQualidade.map((r) => ({
        qualidade: r.qualidade,
        total: Number(r.total ?? 0),
      })),
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
