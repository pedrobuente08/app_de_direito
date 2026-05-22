import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { DrizzleService } from '../db/drizzle.service';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { processo } from '../db/schema/processo';
import {
  processoProcedente,
  procedenteTransicao,
} from '../db/schema/processo-procedente';
import type { ObrigacaoFazerDto } from './dto/obrigacao-fazer.dto';
import type { UpdateProcedenteDto } from './dto/update-procedente.dto';

const SENT = ['PROCEDENTE', 'PARCIAL', 'ACORDO'] as const;

/** Último resultado em `sentenca` é procedente/parcial/acordo. */
const sqlUltimaSentencaProcedente = sql`(
  select s.resultado from sentenca s
  where s.processo_id = ${processo.id}
  order by s.data desc nulls last, s.created_at desc nulls last
  limit 1
) in ('PROCEDENTE','PARCIAL','ACORDO')`;

const sqlUltimaSentencaResultado = sql<string | null>`(
  select s.resultado from sentenca s
  where s.processo_id = ${processo.id}
  order by s.data desc nulls last, s.created_at desc nulls last
  limit 1
)`;

export type ProcedenteListaItem = {
  id: string;
  processoId: string;
  familiaSituacao: string | null;
  situacao: string | null;
  recursoTipo: string | null;
  recursoOrigem: string | null;
  recursoResultado: string | null;
  temObrigacaoFazer?: boolean;
  obrigacaoFazerDescricao?: string | null;
  obrigacaoFazerCumprida?: boolean;
  obrigacaoFazerCumpridaEm?: string | null;
  serasajudAcionado?: boolean;
  docPendente?: string[];
  responsavel: string | null;
  obsCurta: string | null;
  dataEstimadaRecebimento: string | null;
  valorRecebido: string | null;
  dataRecebimento: string | null;
  createdAt: string;
  processo: {
    numero: string;
    clienteNome: string;
    reuTexto: string;
    sentenca: string | null;
  };
};

@Injectable()
export class ProcedentesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly faseDerivacao: FaseDerivacaoService,
    private readonly encadeamentos: EncadeamentosQueueService,
  ) {}

  private isoDate(d: unknown): string | null {
    if (d == null) {
      return null;
    }
    if (d instanceof Date) {
      return d.toISOString().slice(0, 10);
    }
    if (typeof d === 'string') {
      return d.slice(0, 10);
    }
    return null;
  }

  private isoDateTime(d: unknown): string {
    if (d instanceof Date) {
      return d.toISOString();
    }
    if (typeof d === 'string') {
      return d;
    }
    return new Date().toISOString();
  }

  private mapItem(
    p: typeof processo.$inferSelect,
    proc: typeof processoProcedente.$inferSelect | null,
    ultimaSentencaResultado: string | null,
  ): ProcedenteListaItem {
    return {
      id: p.id,
      processoId: p.id,
      familiaSituacao: proc?.familiaSituacao ?? null,
      situacao: proc?.situacao ?? null,
      recursoTipo: proc?.recursoTipo ?? null,
      recursoOrigem: proc?.recursoOrigem ?? null,
      recursoResultado: proc?.recursoResultado ?? null,
      temObrigacaoFazer: proc?.temObrigacaoFazer ?? false,
      obrigacaoFazerDescricao: proc?.obrigacaoFazerDescricao ?? null,
      obrigacaoFazerCumprida: proc?.obrigacaoFazerCumprida ?? false,
      obrigacaoFazerCumpridaEm: this.isoDate(proc?.obrigacaoFazerCumpridaEm),
      serasajudAcionado: proc?.serasajudAcionado ?? false,
      docPendente: proc?.docPendente ?? undefined,
      responsavel: proc?.responsavel ?? null,
      obsCurta: proc?.obsCurta ?? null,
      dataEstimadaRecebimento: this.isoDate(proc?.dataEstimadaRecebimento),
      valorRecebido:
        proc?.valorRecebido != null ? String(proc.valorRecebido) : null,
      dataRecebimento: this.isoDate(proc?.dataRecebimento),
      createdAt: this.isoDateTime(proc?.createdAt ?? p.createdAt),
      processo: {
        numero: p.numero,
        clienteNome: p.clienteNome ?? '',
        reuTexto: p.reuTexto ?? '',
        sentenca: ultimaSentencaResultado,
      },
    };
  }

  private async obterJoinRaw(
    escritorioId: string,
    processoId: string,
  ): Promise<{
    processo: typeof processo.$inferSelect;
    procedente: typeof processoProcedente.$inferSelect | null;
    ultimaSentencaResultado: string | null;
  } | null> {
    const [row] = await this.drizzle.db
      .select({
        processo,
        procedente: processoProcedente,
        ultimaSentencaResultado: sqlUltimaSentencaResultado,
      })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
          sqlUltimaSentencaProcedente,
        ),
      )
      .limit(1);

    if (!row?.processo) {
      return null;
    }
    return row;
  }

  async listar(escritorioId: string, limit = 500): Promise<ProcedenteListaItem[]> {
    const rows = await this.drizzle.db
      .select({
        processo,
        procedente: processoProcedente,
        ultimaSentencaResultado: sqlUltimaSentencaResultado,
      })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(eq(processo.escritorioId, escritorioId), sqlUltimaSentencaProcedente),
      )
      .limit(limit);

    return rows.map(({ processo: p, procedente: proc, ultimaSentencaResultado }) =>
      this.mapItem(p, proc, ultimaSentencaResultado),
    );
  }

  /** Cards §5.2 — funil de procedentes. */
  async resumo(escritorioId: string) {
    const lista = await this.listar(escritorioId, 2000);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ms30 = 30 * 86_400_000;
    const ms60 = 60 * 86_400_000;

    let acaoImediata = 0;
    let aguardando = 0;
    let encerrado30d = 0;
    let semVisto30d = 0;
    let alvara60d = 0;

    for (const p of lista) {
      const fam = (p.familiaSituacao ?? '').toUpperCase();
      if (fam === 'PEND_INTERNA' || fam === 'EXEC_ATIVA') {
        acaoImediata += 1;
      }
      if (fam === 'AGUARDAR_TRANSITO' || fam === 'AGUARDAR_PAGTO') {
        aguardando += 1;
      }
      if (fam === 'ENCERRADO') {
        const created = new Date(p.createdAt).getTime();
        if (hoje.getTime() - created <= ms30) {
          encerrado30d += 1;
        }
      }
      const sit = (p.situacao ?? '').toUpperCase();
      if (sit.includes('ALVARA') || fam.includes('ALVARA')) {
        const created = new Date(p.createdAt).getTime();
        if (hoje.getTime() - created >= ms60 && !p.valorRecebido) {
          alvara60d += 1;
        }
      }
    }

    return {
      totalAtivos: lista.filter((p) => p.familiaSituacao !== 'ENCERRADO').length,
      acaoImediata,
      aguardando,
      encerrado30d,
      semVisto30d,
      alvara60d,
    };
  }

  async obter(
    escritorioId: string,
    processoId: string,
  ): Promise<ProcedenteListaItem> {
    const row = await this.obterJoinRaw(escritorioId, processoId);
    if (!row) {
      throw new NotFoundException(
        'Processo não encontrado ou sem sentença procedente/parcial/acordo.',
      );
    }
    return this.mapItem(
      row.processo,
      row.procedente,
      row.ultimaSentencaResultado,
    );
  }

  /**
   * Processos com última sentença procedente/parcial/acordo mas sem linha em `processo_procedente`.
   */
  async sincronizarLinhasEmFalta(escritorioId: string): Promise<{ criadas: number }> {
    const db = this.drizzle.db;
    const rows = await db
      .select({
        processo,
        procedente: processoProcedente,
      })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sqlUltimaSentencaProcedente,
          isNull(processoProcedente.processoId),
        ),
      );

    let criadas = 0;
    const now = new Date();
    for (const row of rows) {
      const p = row.processo;
      await db
        .insert(processoProcedente)
        .values({
          processoId: p.id,
          escritorioId,
          familiaSituacao: 'AGUARDAR_TRANSITO',
          situacao: 'AGUARDANDO_TRANSITO',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: processoProcedente.processoId,
          set: { updatedAt: now },
        });
      criadas += 1;
      await this.faseDerivacao.aplicarAposMutacao(escritorioId, p.id);
    }

    return { criadas };
  }

  async atualizar(
    escritorioId: string,
    processoId: string,
    dto: UpdateProcedenteDto,
    user: AuthUser,
  ) {
    const row = await this.obterJoinRaw(escritorioId, processoId);

    if (!row?.processo) {
      throw new NotFoundException(
        'Processo não encontrado ou sem sentença procedente/parcial/acordo.',
      );
    }

    const procRow = row.procedente;

    if (!procRow) {
      throw new BadRequestException(
        'Linha de procedente ainda não existe — use «Gerar linhas em falta» ou registre sentença em Intimações.',
      );
    }

    const patch: Partial<typeof processoProcedente.$inferInsert> = {};
    if (dto.familiaSituacao !== undefined) {
      patch.familiaSituacao = dto.familiaSituacao.trim();
    }
    if (dto.situacao !== undefined) {
      patch.situacao = dto.situacao.trim();
    }
    if (dto.recursoTipo !== undefined) {
      patch.recursoTipo = dto.recursoTipo?.trim() || null;
    }
    if (dto.recursoOrigem !== undefined) {
      patch.recursoOrigem = dto.recursoOrigem?.trim() || null;
    }
    if (dto.recursoResultado !== undefined) {
      patch.recursoResultado = dto.recursoResultado?.trim() || null;
    }
    if (dto.docPendente !== undefined) {
      patch.docPendente = dto.docPendente;
    }
    if (dto.responsavel !== undefined) {
      patch.responsavel = dto.responsavel?.trim() || null;
    }
    if (dto.obsCurta !== undefined) {
      patch.obsCurta = dto.obsCurta?.trim() || null;
    }
    if (dto.dataEstimadaRecebimento !== undefined) {
      patch.dataEstimadaRecebimento = dto.dataEstimadaRecebimento;
    }
    if (dto.valorRecebido !== undefined) {
      patch.valorRecebido = dto.valorRecebido;
    }
    if (dto.dataRecebimento !== undefined) {
      patch.dataRecebimento = dto.dataRecebimento;
    }
    if (dto.dataProtocoloAlvara !== undefined) {
      patch.dataProtocoloAlvara = dto.dataProtocoloAlvara;
    }
    if (dto.dataAlvaraExpedido !== undefined) {
      patch.dataAlvaraExpedido = dto.dataAlvaraExpedido;
    }

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Informe ao menos um campo.');
    }

    const situacaoAnterior = procRow.situacao;
    const situacaoNova =
      dto.situacao !== undefined ? dto.situacao.trim() : procRow.situacao;

    patch.ultimoVisto = new Date();
    patch.updatedAt = new Date();

    await this.drizzle.db
      .update(processoProcedente)
      .set(patch)
      .where(eq(processoProcedente.processoId, processoId));

    if (
      dto.situacao !== undefined &&
      situacaoNova !== situacaoAnterior
    ) {
      await this.drizzle.db.insert(procedenteTransicao).values({
        processoId,
        escritorioId,
        situacaoAnterior,
        situacaoNova,
        origem: 'MANUAL',
        usuarioId: user.userId,
      });
    }

    await this.faseDerivacao.aplicarAposMutacao(
      escritorioId,
      processoId,
      user.userId,
    );

    if (
      dto.dataAlvaraExpedido &&
      !procRow.dataAlvaraExpedido
    ) {
      await this.encadeamentos.dispatch(escritorioId, 'alvara_expedido', {
        processoId,
      });
    }

    return this.obter(escritorioId, processoId);
  }

  async atualizarObrigacaoFazer(
    escritorioId: string,
    processoId: string,
    dto: ObrigacaoFazerDto,
  ) {
    const row = await this.obterJoinRaw(escritorioId, processoId);
    if (!row?.procedente) {
      throw new NotFoundException('Linha de procedente não encontrada.');
    }

    const patch: Partial<typeof processoProcedente.$inferInsert> = {
      temObrigacaoFazer: dto.temObrigacaoFazer ?? true,
      obrigacaoFazerDescricao: dto.descricao.trim(),
      updatedAt: new Date(),
    };
    if (dto.cumprida !== undefined) {
      patch.obrigacaoFazerCumprida = dto.cumprida;
    }
    if (dto.cumpridaEm !== undefined) {
      patch.obrigacaoFazerCumpridaEm = dto.cumpridaEm;
    }
    if (dto.serasajudAcionado !== undefined) {
      patch.serasajudAcionado = dto.serasajudAcionado;
    }

    await this.drizzle.db
      .update(processoProcedente)
      .set(patch)
      .where(eq(processoProcedente.processoId, processoId));

    return this.obter(escritorioId, processoId);
  }
}
