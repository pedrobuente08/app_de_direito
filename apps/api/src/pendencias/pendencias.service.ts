import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  pendencia,
  pendenciaHistorico,
  pendenciaProblema,
} from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { parseCsvSimple } from '../importacao/csv-parse';
import type { CreatePendenciaDto } from './dto/create-pendencia.dto';
import type { CumprirPendenciaDto } from './dto/cumprir-pendencia.dto';
import type { UpdatePendenciaDto } from './dto/update-pendencia.dto';

const HISTORICO = new Set(['CUMPRIDO', 'AUTOR FALECIDO']);
const PROBLEMA = new Set([
  'NAO CUMPRIDO',
  'SEM EXITO',
  'DEIXOU DE RESPONDER',
]);

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class PendenciasService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select()
      .from(pendencia)
      .where(eq(pendencia.escritorioId, escritorioId))
      .orderBy(desc(pendencia.createdAt))
      .limit(limit);
  }

  private async assertProcessoDoEscritorio(
    escritorioId: string,
    processoId: string,
  ) {
    const [p] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
        ),
      )
      .limit(1);
    if (!p) {
      throw new BadRequestException('Processo não encontrado neste escritório.');
    }
  }

  async criar(escritorioId: string, dto: CreatePendenciaDto) {
    await this.assertProcessoDoEscritorio(escritorioId, dto.processoId);
    const dataAbertura = dto.dataAbertura ?? hojeIso();
    try {
      const [row] = await this.drizzle.db
        .insert(pendencia)
        .values({
          escritorioId,
          processoId: dto.processoId,
          tipo: dto.tipo.trim(),
          dataAbertura,
          dataLimite: dto.dataLimite ?? null,
          solicitante: dto.solicitante?.trim() || null,
          responsavel: dto.responsavel?.trim() || null,
          status: (dto.status ?? 'ABERTA').trim(),
          observacao: dto.observacao?.trim() || null,
          origem: (dto.origem ?? 'MANUAL').trim(),
        })
        .returning();
      if (!row) {
        throw new ConflictException('Falha ao criar pendência');
      }
      return row;
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      throw new ConflictException(
        'Pendência duplicada para processo + tipo + data de abertura.',
      );
    }
  }

  async obter(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(eq(pendencia.escritorioId, escritorioId), eq(pendencia.id, id)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Pendência não encontrada');
    }
    return row;
  }

  async atualizar(escritorioId: string, id: string, dto: UpdatePendenciaDto) {
    const current = await this.obter(escritorioId, id);
    const nextStatus = (dto.status?.trim() ?? current.status).toUpperCase();

    if (HISTORICO.has(nextStatus)) {
      return this.moverParaHistorico(escritorioId, current, nextStatus, dto);
    }
    if (PROBLEMA.has(nextStatus)) {
      return this.moverParaProblema(escritorioId, current, nextStatus, dto);
    }

    const patch: Partial<typeof pendencia.$inferInsert> = {};
    if (dto.dataLimite !== undefined) {
      patch.dataLimite = dto.dataLimite;
    }
    if (dto.solicitante !== undefined) {
      patch.solicitante = dto.solicitante?.trim() || null;
    }
    if (dto.responsavel !== undefined) {
      patch.responsavel = dto.responsavel?.trim() || null;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status.trim();
    }
    if (dto.dataCumprimento !== undefined) {
      patch.dataCumprimento = dto.dataCumprimento;
    }
    if (dto.observacao !== undefined) {
      patch.observacao = dto.observacao?.trim() || null;
    }

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Informe ao menos um campo.');
    }

    await this.drizzle.db
      .update(pendencia)
      .set(patch)
      .where(
        and(eq(pendencia.escritorioId, escritorioId), eq(pendencia.id, id)),
      );

    return this.obter(escritorioId, id);
  }

  private async moverParaHistorico(
    escritorioId: string,
    current: typeof pendencia.$inferSelect,
    status: string,
    dto: UpdatePendenciaDto,
  ) {
    const dataCumprimento = dto.dataCumprimento ?? hojeIso();

    await this.drizzle.db.transaction(async (tx) => {
      await tx.insert(pendenciaHistorico).values({
        pendenciaIdOrigem: current.id,
        escritorioId,
        processoId: current.processoId,
        tipo: current.tipo,
        dataAbertura: current.dataAbertura,
        dataLimite: current.dataLimite,
        solicitante: current.solicitante,
        responsavel: current.responsavel,
        status,
        dataCumprimento,
        observacao:
          dto.observacao !== undefined
            ? dto.observacao?.trim() || null
            : current.observacao,
        origem: current.origem,
        createdAtOrigem: current.createdAt,
      });
      await tx
        .delete(pendencia)
        .where(
          and(
            eq(pendencia.escritorioId, escritorioId),
            eq(pendencia.id, current.id),
          ),
        );
    });

    const [last] = await this.drizzle.db
      .select()
      .from(pendenciaHistorico)
      .where(eq(pendenciaHistorico.pendenciaIdOrigem, current.id))
      .orderBy(desc(pendenciaHistorico.archivedAt))
      .limit(1);

    return { movidoPara: 'historico', registro: last };
  }

  private async moverParaProblema(
    escritorioId: string,
    current: typeof pendencia.$inferSelect,
    status: string,
    dto: UpdatePendenciaDto,
  ) {
    await this.drizzle.db.transaction(async (tx) => {
      await tx.insert(pendenciaProblema).values({
        pendenciaIdOrigem: current.id,
        escritorioId,
        processoId: current.processoId,
        tipo: current.tipo,
        dataAbertura: current.dataAbertura,
        dataLimite: current.dataLimite,
        solicitante: current.solicitante,
        responsavel: current.responsavel,
        status,
        observacao:
          dto.observacao !== undefined
            ? dto.observacao?.trim() || null
            : current.observacao,
        origem: current.origem,
        createdAtOrigem: current.createdAt,
      });
      await tx
        .delete(pendencia)
        .where(
          and(
            eq(pendencia.escritorioId, escritorioId),
            eq(pendencia.id, current.id),
          ),
        );
    });

    const [last] = await this.drizzle.db
      .select()
      .from(pendenciaProblema)
      .where(eq(pendenciaProblema.pendenciaIdOrigem, current.id))
      .orderBy(desc(pendenciaProblema.movedAt))
      .limit(1);

    return { movidoPara: 'problema', registro: last };
  }

  async cumprir(
    escritorioId: string,
    id: string,
    dto: CumprirPendenciaDto,
  ) {
    const current = await this.obter(escritorioId, id);
    const status = (dto.status ?? 'CUMPRIDO').trim().toUpperCase();
    if (!HISTORICO.has(status)) {
      throw new BadRequestException(
        'Status inválido para cumprir. Use CUMPRIDO ou AUTOR FALECIDO.',
      );
    }
    return this.moverParaHistorico(escritorioId, current, status, {
      dataCumprimento: hojeIso(),
    });
  }

  /** `id` = registro em `pendencia_historico` (reabre pendência ativa). */
  async reabrirDeHistorico(escritorioId: string, historicoId: string) {
    const [h] = await this.drizzle.db
      .select()
      .from(pendenciaHistorico)
      .where(
        and(
          eq(pendenciaHistorico.escritorioId, escritorioId),
          eq(pendenciaHistorico.id, historicoId),
        ),
      )
      .limit(1);

    if (!h) {
      throw new NotFoundException('Registro de histórico não encontrado');
    }

    const hoje = hojeIso();
    try {
      const [row] = await this.drizzle.db
        .insert(pendencia)
        .values({
          escritorioId,
          processoId: h.processoId,
          tipo: h.tipo,
          dataAbertura: hoje,
          dataLimite: h.dataLimite,
          solicitante: h.solicitante,
          responsavel: h.responsavel,
          status: 'ABERTA',
          observacao: h.observacao,
          origem: h.origem,
        })
        .returning();
      if (!row) {
        throw new ConflictException('Falha ao reabrir pendência');
      }
      return row;
    } catch {
      throw new ConflictException(
        'Não foi possível reabrir: já existe pendência ativa com mesmo tipo e data de abertura.',
      );
    }
  }

  async importarCsv(escritorioId: string, csv: string) {
    const linhas = parseCsvSimple(csv);
    const erros: { linha: number; mensagem: string }[] = [];
    let importados = 0;

    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      const processoId = (row.processo_id ?? '').trim();
      const tipo = (row.tipo ?? '').trim();
      if (!processoId || !tipo) {
        erros.push({
          linha: i + 2,
          mensagem: 'processo_id e tipo são obrigatórios.',
        });
        continue;
      }
      try {
        await this.criar(escritorioId, {
          processoId,
          tipo,
          dataAbertura: row.data_abertura?.trim() || undefined,
          dataLimite: row.data_limite?.trim() || null,
          solicitante: row.solicitante?.trim() || null,
          responsavel: row.responsavel?.trim() || null,
          status: row.status?.trim() || undefined,
          observacao: row.observacao?.trim() || null,
          origem: row.origem?.trim() || 'IMPORT',
        });
        importados += 1;
      } catch (e) {
        erros.push({ linha: i + 2, mensagem: (e as Error).message });
      }
    }

    return { importados, erros, totalLinhas: linhas.length };
  }
}
