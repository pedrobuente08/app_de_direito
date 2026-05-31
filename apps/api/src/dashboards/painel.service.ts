import { Injectable, Logger } from '@nestjs/common';
import { and, count, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { DrizzleService } from '../db/drizzle.service';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { sentenca } from '../db/schema/sentenca';
import {
  mediaBenchmarkVaras,
  queryTaxaExito,
  queryTempoSentencaMedioEscritorio,
  queryTempoSentencaPorVara,
} from './jurimetria.query';

export type PainelPeriodo = 'mes' | 'acervo';

export type PainelKpi = {
  label: string;
  value: string;
  delta: string;
  deltaLabel: string;
  icon: 'file' | 'calendar' | 'shield' | 'clock';
  type: 'up' | 'warn' | 'ochre';
};

export type PainelJurimetriaRow = {
  comarca: string;
  subtext: string;
  seu: number;
  media: number;
  acima?: boolean;
};

export type PainelPrazo = {
  id: string;
  dia: number;
  mes: string;
  tipo: string;
  caso: string;
  fonte: string;
  responsavel: string;
  responsavelCor: string;
  criticidade: 'crit' | 'soon' | 'ok';
};

export type PainelPrevisao = {
  disponivel: boolean;
  caso: string;
  numero: string;
  tipo: string;
  probabilidade: number;
  valor: string | null;
  duracao: string | null;
  vara: string;
  tendencia: string | null;
  amostra: number;
};

export type PainelResponse = {
  periodo: PainelPeriodo;
  resumoUrgencias: string;
  kpis: PainelKpi[];
  jurimetria: {
    rows: PainelJurimetriaRow[];
    insight: string;
    insightIa: boolean;
  };
  previsao: PainelPrevisao;
  prazos: PainelPrazo[];
};

const CORES_RESP = ['#2B5C47', '#BD7A34', '#1C4435', '#3C7A55', '#9A5226'];

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function inicioMesYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function corResponsavel(nome: string | null | undefined): string {
  const n = (nome ?? '').trim() || '?';
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return CORES_RESP[h % CORES_RESP.length]!;
}

function iniciais(nome: string | null | undefined): string {
  const t = (nome ?? '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function fmtMesAbrev(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(`${iso}T12:00:00`))
    .replace('.', '');
}

function fmtTempoMeses(meses: number): string {
  if (meses <= 0) return '—';
  const anos = Math.floor(meses / 12);
  const m = Math.round(meses % 12);
  if (anos > 0 && m > 0) return `${anos}a ${m}m`;
  if (anos > 0) return `${anos}a`;
  return `${Math.round(meses)}m`;
}

function labelFonte(origem: string | null | undefined): string {
  const o = (origem ?? '').toUpperCase();
  if (o.includes('COMUNICA') || o.includes('DJEN') || o.includes('CAPTURA')) return 'DJEN';
  if (o.includes('MANUAL')) return 'Manual';
  return origem?.trim() || 'Sistema';
}

function criticidadePrazo(dataLimite: string, hoje: string): 'crit' | 'soon' | 'ok' {
  if (dataLimite <= hoje) return 'crit';
  const limSoon = addDaysYmd(hoje, 2);
  if (dataLimite <= limSoon) return 'soon';
  return 'ok';
}

function truncarCaso(cliente: string | null, numero: string): string {
  const c = cliente?.trim() || 'Cliente';
  const numCurto =
    numero.length > 18 ? `${numero.slice(0, 8)}…${numero.slice(-8)}` : numero;
  return `${c} · ${numCurto}`;
}

@Injectable()
export class PainelService {
  private readonly log = new Logger(PainelService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly aiGateway: AiGatewayService,
  ) {}

  async obterPainel(
    escritorioId: string,
    userId: string,
    periodo: PainelPeriodo = 'acervo',
  ): Promise<PainelResponse> {
    const hoje = hojeYmd();
    const ate7 = addDaysYmd(hoje, 7);
    const inicioMes = inicioMesYmd();

    const filtroMesProc =
      periodo === 'mes'
        ? gte(processo.createdAt, new Date(`${inicioMes}T00:00:00.000Z`))
        : undefined;

    const [ativosRow] = await this.drizzle.db
      .select({ total: count() })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.statusProcesso, 'ATIVO'),
          ...(filtroMesProc ? [filtroMesProc] : []),
        ),
      );

    const [novosMesRow] = await this.drizzle.db
      .select({ total: count() })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          gte(processo.createdAt, new Date(`${inicioMes}T00:00:00.000Z`)),
        ),
      );

    const [prazos7Row] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
          lte(pendencia.dataLimite, ate7),
          gte(pendencia.dataLimite, hoje),
        ),
      );

    const [criticosRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
          lte(pendencia.dataLimite, ate7),
          lte(pendencia.dataLimite, addDaysYmd(hoje, 2)),
        ),
      );

    const [semRespRow] = await this.drizzle.db
      .select({ total: count() })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
          lte(pendencia.dataLimite, ate7),
          gte(pendencia.dataLimite, hoje),
          or(isNull(pendencia.responsavel), sql`trim(${pendencia.responsavel}) = ''`),
        ),
      );

    const taxaExito = await queryTaxaExito(this.drizzle, escritorioId);
    const tempoMedio = await queryTempoSentencaMedioEscritorio(this.drizzle, escritorioId);
    const varasTempo = await queryTempoSentencaPorVara(this.drizzle, escritorioId, 6);
    const benchmark = mediaBenchmarkVaras(varasTempo);

    const processosAtivos = Number(ativosRow?.total ?? 0);
    const prazos7 = Number(prazos7Row?.total ?? 0);
    const criticos = Number(criticosRow?.total ?? 0);
    const semResp = Number(semRespRow?.total ?? 0);
    const novosMes = Number(novosMesRow?.total ?? 0);

    const pctExito = taxaExito?.pctProcedentes ?? 0;
    const tempoFmt = tempoMedio != null ? fmtTempoMeses(tempoMedio) : '—';
    const diffTempoPct =
      tempoMedio != null && benchmark > 0
        ? Math.round(((tempoMedio - benchmark) / benchmark) * 100)
        : 0;

    const kpis: PainelKpi[] = [
      {
        label: 'Processos ativos',
        value: String(processosAtivos),
        delta: `+${novosMes}`,
        deltaLabel: periodo === 'mes' ? 'novos no mês' : 'novos este mês',
        icon: 'file',
        type: 'up',
      },
      {
        label: 'Prazos em 7 dias',
        value: String(prazos7),
        delta: criticos > 0 ? `${criticos} crítico(s)` : '—',
        deltaLabel: semResp > 0 ? `${semResp} sem responsável` : 'com responsável',
        icon: 'calendar',
        type: criticos > 0 || semResp > 0 ? 'warn' : 'up',
      },
      {
        label: 'Taxa de êxito',
        value: taxaExito ? `${pctExito}%` : '—',
        delta: taxaExito ? `${taxaExito.totalComSentenca} casos` : '—',
        deltaLabel: 'com sentença registrada',
        icon: 'shield',
        type: 'up',
      },
      {
        label: 'Tempo até sentença',
        value: tempoFmt,
        delta:
          diffTempoPct !== 0
            ? `${diffTempoPct > 0 ? '▲' : '▼'} ${Math.abs(diffTempoPct)}%`
            : '—',
        deltaLabel: 'vs. média do escritório',
        icon: 'clock',
        type: diffTempoPct > 5 ? 'ochre' : 'up',
      },
    ];

    const jurimetriaRows: PainelJurimetriaRow[] = varasTempo.map((r) => ({
      comarca: r.vara.length > 28 ? `${r.vara.slice(0, 26)}…` : r.vara,
      subtext: `${r.amostra} sentença(s)`,
      seu: r.avgMeses,
      media: benchmark,
      acima: r.avgMeses > benchmark,
    }));

    const insight = await this.gerarInsight(
      escritorioId,
      userId,
      jurimetriaRows,
      benchmark,
    );

    const previsao = await this.obterPrevisao(escritorioId, benchmark);

    const prazosRows = await this.drizzle.db
      .select({
        id: pendencia.id,
        tipo: pendencia.tipo,
        dataLimite: pendencia.dataLimite,
        responsavel: pendencia.responsavel,
        origem: pendencia.origem,
        clienteNome: processo.clienteNome,
        numero: processo.numero,
      })
      .from(pendencia)
      .innerJoin(processo, eq(pendencia.processoId, processo.id))
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
          sql`${pendencia.dataLimite} is not null`,
          lte(pendencia.dataLimite, ate7),
          gte(pendencia.dataLimite, hoje),
        ),
      )
      .orderBy(pendencia.dataLimite)
      .limit(8);

    const prazos: PainelPrazo[] = prazosRows.map((r) => {
      const dl = String(r.dataLimite);
      const resp = r.responsavel?.trim() || '';
      return {
        id: r.id,
        dia: new Date(`${dl}T12:00:00`).getDate(),
        mes: fmtMesAbrev(dl),
        tipo: r.tipo,
        caso: truncarCaso(r.clienteNome, r.numero),
        fonte: labelFonte(r.origem),
        responsavel: iniciais(resp || '?'),
        responsavelCor: corResponsavel(resp),
        criticidade: criticidadePrazo(dl, hoje),
      };
    });

    const resumoUrgencias =
      prazos7 > 0
        ? `${prazos7} prazo(s) exigem atenção nos próximos 7 dias.`
        : 'Nenhum prazo urgente nos próximos 7 dias.';

    return {
      periodo,
      resumoUrgencias,
      kpis,
      jurimetria: {
        rows: jurimetriaRows,
        insight: insight.texto,
        insightIa: insight.ia,
      },
      previsao,
      prazos,
    };
  }

  private async gerarInsight(
    escritorioId: string,
    userId: string,
    rows: PainelJurimetriaRow[],
    benchmark: number,
  ): Promise<{ texto: string; ia: boolean }> {
    if (!rows.length) {
      return {
        texto:
          'Ainda não há sentenças suficientes para comparar tempos de tramitação por vara. Registre sentenças nos processos encerrados para ativar a jurimetria.',
        ia: false,
      };
    }

    const acima = rows.filter((r) => r.acima);
    const payload = JSON.stringify({
      benchmarkMeses: benchmark,
      varas: rows.map((r) => ({
        vara: r.comarca,
        meses: r.seu,
        media: r.media,
        acima: r.acima,
        amostra: r.subtext,
      })),
    });

    if (this.aiGateway.isAnthropicConfigured()) {
      try {
        const res = await this.aiGateway.call({
          feature: 'JURIMETRIA_INSIGHT',
          payload: `Analise os tempos médios de tramitação (meses) por vara e produza 2 frases objetivas em português para o advogado. Dados: ${payload}`,
          tenantId: escritorioId,
          userId,
        });
        return { texto: res.text, ia: true };
      } catch (e) {
        this.log.warn(`Insight IA falhou: ${(e as Error).message}`);
      }
    }

    const pior = [...rows].sort((a, b) => b.seu - a.seu)[0]!;
    const melhor = [...rows].sort((a, b) => a.seu - b.seu)[0]!;
    let texto = `Em ${pior.comarca} o tempo médio (${pior.seu} meses) `;
    texto += pior.acima
      ? `está acima da média do escritório (${benchmark} meses).`
      : `está dentro da média do escritório.`;
    if (melhor.comarca !== pior.comarca) {
      texto += ` ${melhor.comarca} apresenta o menor tempo (${melhor.seu} meses).`;
    }
    if (acima.length > 0) {
      texto += ` ${acima.length} vara(s) acima do benchmark interno.`;
    }
    return { texto, ia: false };
  }

  private async obterPrevisao(
    escritorioId: string,
    benchmarkMeses: number,
  ): Promise<PainelPrevisao> {
    const [caso] = await this.drizzle.db
      .select({
        id: processo.id,
        numero: processo.numero,
        clienteNome: processo.clienteNome,
        reuTexto: processo.reuTexto,
        materia: processo.materia,
        vara: processo.vara,
      })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.statusProcesso, 'ATIVO'),
        ),
      )
      .orderBy(sql`${processo.updatedAt} desc`)
      .limit(1);

    if (!caso) {
      return {
        disponivel: false,
        caso: '—',
        numero: '—',
        tipo: '—',
        probabilidade: 0,
        valor: null,
        duracao: null,
        vara: '—',
        tendencia: null,
        amostra: 0,
      };
    }

    const varaKey = (caso.vara ?? '').trim() || '(sem vara)';
    const materiaKey = (caso.materia ?? '').trim() || '(sem matéria)';

    const stats = await this.drizzle.db
      .select({
        total: count(),
        procedentes: sql<number>`count(*) filter (where exists (
          select 1 from ${sentenca} s
          where s.processo_id = ${processo.id}
            and s.resultado in ('PROCEDENTE','PARCIAL','ACORDO')
        ))::int`,
      })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`coalesce(nullif(trim(${processo.vara}), ''), '(sem vara)') = ${varaKey}`,
          sql`coalesce(nullif(trim(${processo.materia}), ''), '(sem matéria)') = ${materiaKey}`,
        ),
      );

    const total = Number(stats[0]?.total ?? 0);
    const proc = Number(stats[0]?.procedentes ?? 0);
    const prob = total >= 5 ? Math.round((proc / total) * 100) : 0;

    const cliente = caso.clienteNome?.trim() || 'Cliente';
    const reu = caso.reuTexto?.trim() || 'Réu';
    const duracao =
      benchmarkMeses > 0 ? `~${Math.round(benchmarkMeses)} meses` : null;

    return {
      disponivel: total >= 5,
      caso: `${cliente} × ${reu.length > 24 ? `${reu.slice(0, 22)}…` : reu}`,
      numero: caso.numero,
      tipo: caso.materia?.trim() || '—',
      probabilidade: prob,
      valor: null,
      duracao,
      vara: caso.vara?.trim() || '—',
      tendencia: total >= 5 ? `${prob}%` : null,
      amostra: total,
    };
  }
}
