import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import {
  processoProcedente,
  procedenteTransicao,
} from '../db/schema/processo-procedente';
import type { UpdateProcedenteDto } from './dto/update-procedente.dto';

const SENT = ['PROCEDENTE', 'PARCIAL', 'ACORDO'] as const;

export type ProcedenteListaItem = {
  id: string;
  processoId: string;
  familiaSituacao: string | null;
  situacao: string | null;
  recursoTipo: string | null;
  recursoOrigem: string | null;
  recursoResultado: string | null;
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
  constructor(private readonly drizzle: DrizzleService) {}

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
  ): ProcedenteListaItem {
    return {
      id: p.id,
      processoId: p.id,
      familiaSituacao: proc?.familiaSituacao ?? null,
      situacao: proc?.situacao ?? null,
      recursoTipo: proc?.recursoTipo ?? null,
      recursoOrigem: proc?.recursoOrigem ?? null,
      recursoResultado: proc?.recursoResultado ?? null,
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
        sentenca: p.sentenca,
      },
    };
  }

  private async obterJoinRaw(
    escritorioId: string,
    processoId: string,
  ): Promise<{
    processo: typeof processo.$inferSelect;
    procedente: typeof processoProcedente.$inferSelect | null;
  } | null> {
    const [row] = await this.drizzle.db
      .select({ processo, procedente: processoProcedente })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
          inArray(processo.sentenca, [...SENT]),
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
      })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          inArray(processo.sentenca, [...SENT]),
        ),
      )
      .limit(limit);

    return rows.map(({ processo: p, procedente: proc }) =>
      this.mapItem(p, proc),
    );
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
    return this.mapItem(row.processo, row.procedente);
  }

  /**
   * Processos com sentença procedente/parcial/acordo mas sem linha em `processo_procedente`
   * (ex.: dados migrados). Mesma lógica que `ProcessosService.syncProcedenteSeNecessario`.
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
          inArray(processo.sentenca, [...SENT]),
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
        'Linha de procedente ainda não existe — use «Gerar linhas em falta» ou altere a sentença em Intimações e salve novamente.',
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

    return this.obter(escritorioId, processoId);
  }
}
