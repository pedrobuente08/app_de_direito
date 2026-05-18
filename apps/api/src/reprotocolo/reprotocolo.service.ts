import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { processoReprotocolo } from '../db/schema/processo-reprotocolo';
import type { UpsertReprotocoloDto } from './dto/upsert-reprotocolo.dto';

@Injectable()
export class ReprotocoloService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async assertProcesso(escritorioId: string, processoId: string) {
    const [row] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, processoId)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Processo não encontrado');
    }
  }

  async listar(escritorioId: string, subEstado?: string) {
    const conds = [eq(processoReprotocolo.escritorioId, escritorioId)];
    if (subEstado?.trim()) {
      conds.push(eq(processoReprotocolo.subEstado, subEstado.trim()));
    }

    return this.drizzle.db
      .select({
        reprotocolo: processoReprotocolo,
        processo: {
          id: processo.id,
          numero: processo.numero,
          clienteNome: processo.clienteNome,
          reuTexto: processo.reuTexto,
          faseAtual: processo.faseAtual,
        },
      })
      .from(processoReprotocolo)
      .innerJoin(processo, eq(processo.id, processoReprotocolo.processoId))
      .where(and(...conds))
      .orderBy(desc(processoReprotocolo.createdAt))
      .limit(500);
  }

  async resumo(escritorioId: string) {
    const rows = await this.drizzle.db
      .select({
        subEstado: processoReprotocolo.subEstado,
        total: sql<number>`count(*)::int`,
      })
      .from(processoReprotocolo)
      .where(eq(processoReprotocolo.escritorioId, escritorioId))
      .groupBy(processoReprotocolo.subEstado);

    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const corte = seteDiasAtras.toISOString().slice(0, 10);

    const [revisitar] = await this.drizzle.db
      .select({ total: sql<number>`count(*)::int` })
      .from(processoReprotocolo)
      .where(
        and(
          eq(processoReprotocolo.escritorioId, escritorioId),
          or(
            eq(processoReprotocolo.subEstado, 'AGUARDANDO_ISENCAO_CUSTAS'),
            eq(processoReprotocolo.subEstado, 'AGUARDANDO_ANALISE'),
            eq(processoReprotocolo.subEstado, 'AGUARDANDO_DOC_CLIENTE'),
          ),
          lt(processoReprotocolo.createdAt, new Date(`${corte}T00:00:00.000Z`)),
        ),
      );

    const porSubEstado: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const k = r.subEstado ?? 'SEM_SUB_ESTADO';
      porSubEstado[k] = r.total;
      total += r.total;
    }

    return {
      total,
      porSubEstado,
      aRevisitarSemana: revisitar?.total ?? 0,
    };
  }

  async obter(escritorioId: string, processoId: string) {
    await this.assertProcesso(escritorioId, processoId);
    const [row] = await this.drizzle.db
      .select()
      .from(processoReprotocolo)
      .where(
        and(
          eq(processoReprotocolo.escritorioId, escritorioId),
          eq(processoReprotocolo.processoId, processoId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Registro de reprotocolo não encontrado');
    }
    return row;
  }

  async upsert(escritorioId: string, processoId: string, dto: UpsertReprotocoloDto) {
    await this.assertProcesso(escritorioId, processoId);

    const values: typeof processoReprotocolo.$inferInsert = {
      processoId,
      escritorioId,
      subEstado: dto.subEstado ?? null,
      motivoExtincao: dto.motivoExtincao?.trim() || null,
      modalidadeExtincao: dto.modalidadeExtincao?.trim() || null,
      dataExtincao: dto.dataExtincao ?? null,
      dataIsencaoPedida: dto.dataIsencaoPedida ?? null,
      dataIsencaoResultado: dto.dataIsencaoResultado?.trim() || null,
      dataReprotocolo: dto.dataReprotocolo ?? null,
      processoNovoId: dto.processoNovoId ?? null,
      observacoes: dto.observacoes?.trim() || null,
    };

    const [row] = await this.drizzle.db
      .insert(processoReprotocolo)
      .values(values)
      .onConflictDoUpdate({
        target: processoReprotocolo.processoId,
        set: {
          subEstado: values.subEstado,
          motivoExtincao: values.motivoExtincao,
          modalidadeExtincao: values.modalidadeExtincao,
          dataExtincao: values.dataExtincao,
          dataIsencaoPedida: values.dataIsencaoPedida,
          dataIsencaoResultado: values.dataIsencaoResultado,
          dataReprotocolo: values.dataReprotocolo,
          processoNovoId: values.processoNovoId,
          observacoes: values.observacoes,
        },
      })
      .returning();

    return row;
  }
}
