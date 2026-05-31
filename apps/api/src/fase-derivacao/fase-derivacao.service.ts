import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia, audienciaHistorico } from '../db/schema/audiencia';
import { faseHistorico } from '../db/schema/fase-historico';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { sentenca } from '../db/schema/sentenca';
import {
  FaseDerivada,
  pendenciaFaseCanonical,
} from './fase-derivacao.constants';

const SENT_PROC = new Set(['PROCEDENTE', 'PARCIAL', 'ACORDO']);

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Fase sugerida por tipo de pendência (quando é a pendência mais urgente). */
function fasePorTipoPendencia(tipo: string): string | null {
  const t = stripAccents(tipo.trim()).toUpperCase();
  if (t.includes('PROCURACAO')) {
    return FaseDerivada.AGUARDANDO_PROCURACAO;
  }
  if (
    t.includes('RECURSO') ||
    t.includes('ELABORAR') ||
    t.includes('CONTRARRAZOES') ||
    t.includes('CONTRARRAZ')
  ) {
    return FaseDerivada.EM_RECURSO;
  }
  if (t.includes('ALVAR')) {
    return FaseDerivada.AGUARDANDO_ALVARA;
  }
  return null;
}

function ymd(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return null;
}

@Injectable()
export class FaseDerivacaoService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Recalcula e persiste `processo.fase_atual` conforme E3.
   * Retorna a fase gravada (pode ser igual à anterior).
   * Não sobrescreve quando `fase_travada = true` (fase definida por automação COMUNICA).
   */
  async aplicarAposMutacao(
    escritorioId: string,
    processoId: string,
    usuarioId?: string | null,
  ): Promise<string | null> {
    const db = this.drizzle.db;
    const [proc] = await db
      .select()
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
        ),
      )
      .limit(1);
    if (!proc) {
      return null;
    }

    if (proc.faseTravada) {
      return proc.faseAtual?.trim() ?? null;
    }

    const nova = await this.derivar(escritorioId, processoId);
    if (nova === null) {
      return proc.faseAtual?.trim() ?? null;
    }

    const atual = proc.faseAtual?.trim() ?? null;
    if (atual === nova) {
      return nova;
    }

    const now = new Date();
    await db
      .update(processo)
      .set({ faseAtual: nova, faseUpdatedAt: now, updatedAt: now })
      .where(eq(processo.id, processoId));

    await db.insert(faseHistorico).values({
      processoId,
      escritorioId,
      faseAnterior: atual,
      faseNova: nova,
      origem: 'DERIVACAO',
      usuarioId: usuarioId ?? null,
    });

    return nova;
  }

  /**
   * Força uma fase específica sem recalcular pelo estado do processo.
   * Usado por automações externas (ex.: regra DJEN) onde a fase alvo
   * é determinada pela publicação, não pelo estado interno.
   */
  async forcarFase(
    escritorioId: string,
    processoId: string,
    novaFase: string,
  ): Promise<void> {
    const db = this.drizzle.db;
    const [proc] = await db
      .select({ faseAtual: processo.faseAtual })
      .from(processo)
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, processoId)),
      )
      .limit(1);
    if (!proc) return;

    const atual = proc.faseAtual?.trim() ?? null;
    if (atual === novaFase) return;

    const now = new Date();
    await db
      .update(processo)
      .set({ faseAtual: novaFase, faseUpdatedAt: now, updatedAt: now, faseTravada: true })
      .where(eq(processo.id, processoId));

    await db.insert(faseHistorico).values({
      processoId,
      escritorioId,
      faseAnterior: atual,
      faseNova: novaFase,
      origem: 'COMUNICA',
      usuarioId: null,
    });
  }

  /**
   * Remove o travamento de fase — permite que a derivação automática
   * volte a funcionar normalmente. Chamado quando o usuário muda a fase
   * manualmente ou quando uma pendência é resolvida.
   */
  async destravrarFase(escritorioId: string, processoId: string): Promise<void> {
    await this.drizzle.db
      .update(processo)
      .set({ faseTravada: false, updatedAt: new Date() })
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, processoId)),
      );
  }

  /** Apenas cálculo, sem persistir. */
  async derivar(
    escritorioId: string,
    processoId: string,
  ): Promise<string | null> {
    const db = this.drizzle.db;

    const pendentes = await db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    if (pendentes.length > 0) {
      const sorted = [...pendentes].sort((a, b) => {
        const da = a.dataLimite ? String(a.dataLimite) : '9999-12-31';
        const dbi = b.dataLimite ? String(b.dataLimite) : '9999-12-31';
        return da.localeCompare(dbi);
      });
      const escolhida = sorted[0]!;
      const porMapa = fasePorTipoPendencia(escolhida.tipo);
      if (porMapa) {
        return porMapa;
      }
      return pendenciaFaseCanonical(escolhida.tipo);
    }

    const [pp] = await db
      .select()
      .from(processoProcedente)
      .where(eq(processoProcedente.processoId, processoId))
      .limit(1);

    if (pp?.recursoTipo?.trim()) {
      return FaseDerivada.EM_RECURSO;
    }

    const [audAg] = await db
      .select({ id: audiencia.id })
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          eq(audiencia.processoId, processoId),
          eq(audiencia.status, 'AGENDADA'),
        ),
      )
      .limit(1);
    if (audAg) {
      return FaseDerivada.AGUARDANDO_AUDIENCIA;
    }

    const [ultAudReal] = await db
      .select()
      .from(audienciaHistorico)
      .where(
        and(
          eq(audienciaHistorico.escritorioId, escritorioId),
          eq(audienciaHistorico.processoId, processoId),
          eq(audienciaHistorico.status, 'REALIZADA'),
        ),
      )
      .orderBy(desc(audienciaHistorico.archivedAt))
      .limit(1);

    const [ultSen] = await db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .orderBy(desc(sentenca.data), desc(sentenca.createdAt))
      .limit(1);

    if (ultAudReal) {
      const dataAud = ymd(ultAudReal.data);
      const dataSen = ultSen ? ymd(ultSen.data) : null;
      const semSentencaPosAud =
        !ultSen || (dataAud && dataSen && dataSen < dataAud);
      if (semSentencaPosAud) {
        return FaseDerivada.AGUARDANDO_SENTENCA;
      }
    }

    const ultRes = ultSen?.resultado?.trim().toUpperCase() ?? '';
    if (SENT_PROC.has(ultRes) && pp) {
      const sit = (pp.situacao ?? '').toUpperCase();
      const fam = (pp.familiaSituacao ?? '').toUpperCase();
      if (sit.includes('ALVAR') || fam === 'PEND_INTERNA') {
        return FaseDerivada.AGUARDANDO_ALVARA;
      }
      if (sit.includes('TRANSITO') || fam === 'AGUARDAR_TRANSITO') {
        return FaseDerivada.AGUARDANDO_TRANSITO;
      }
      return FaseDerivada.AGUARDANDO_TRANSITO;
    }

    return null;
  }

  /** Pendências com status considerado “aberto” para bloqueio de fase manual. */
  async contarPendenciasAbertas(
    escritorioId: string,
    processoId: string,
  ): Promise<number> {
    const [row] = await this.drizzle.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );
    return row?.n ?? 0;
  }
}
