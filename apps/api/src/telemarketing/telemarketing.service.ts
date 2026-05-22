import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import type { CumprirPendenciaDto } from '../pendencias/dto/cumprir-pendencia.dto';
import { PendenciasService } from '../pendencias/pendencias.service';

const FILA = 'ATENDIMENTO';

@Injectable()
export class TelemarketingService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pendencias: PendenciasService,
  ) {}

  async resumo(escritorioId: string) {
    const hoje = new Date().toISOString().slice(0, 10);
    const trintaDias = new Date();
    trintaDias.setDate(trintaDias.getDate() - 30);
    const corte30 = trintaDias.toISOString().slice(0, 10);

    const base = and(
      eq(pendencia.escritorioId, escritorioId),
      eq(pendencia.fila, FILA),
    );

    const [abertas] = await this.drizzle.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pendencia)
      .where(and(base, eq(pendencia.status, 'ABERTA')));

    const emTresDias = new Date();
    emTresDias.setDate(emTresDias.getDate() + 3);
    const limiteVencendo = emTresDias.toISOString().slice(0, 10);

    const [vencendo] = await this.drizzle.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pendencia)
      .where(
        and(
          base,
          eq(pendencia.status, 'ABERTA'),
          isNotNull(pendencia.dataLimite),
          lte(pendencia.dataLimite, limiteVencendo),
        ),
      );

    const [naFila] = await this.drizzle.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pendencia)
      .where(
        and(
          base,
          eq(pendencia.status, 'ABERTA'),
          or(isNull(pendencia.responsavel), eq(pendencia.responsavel, '')),
        ),
      );

    const [cumpridas30d] = await this.drizzle.db
      .select({ n: sql<number>`count(*)::int` })
      .from(pendencia)
      .where(
        and(
          base,
          eq(pendencia.status, 'CUMPRIDA'),
          gte(pendencia.dataCumprimento, corte30),
        ),
      );

    return {
      abertas: abertas?.n ?? 0,
      vencendo: vencendo?.n ?? 0,
      naFila: naFila?.n ?? 0,
      cumpridas30d: cumpridas30d?.n ?? 0,
    };
  }

  listar(escritorioId: string, responsavel?: string) {
    const conds = [
      eq(pendencia.escritorioId, escritorioId),
      eq(pendencia.fila, FILA),
      eq(pendencia.status, 'ABERTA'),
    ];
    if (responsavel?.trim()) {
      conds.push(eq(pendencia.responsavel, responsavel.trim()));
    }

    return this.drizzle.db
      .select({
        pendencia,
        processo: {
          id: processo.id,
          numero: processo.numero,
          clienteNome: processo.clienteNome,
          telefone: processo.telefone,
        },
      })
      .from(pendencia)
      .innerJoin(processo, eq(processo.id, pendencia.processoId))
      .where(and(...conds))
      .orderBy(pendencia.dataLimite, desc(pendencia.createdAt))
      .limit(200);
  }

  async puxar(escritorioId: string, usuarioId: string, usuarioNome: string) {
    const [next] = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.fila, FILA),
          eq(pendencia.status, 'ABERTA'),
          or(isNull(pendencia.responsavel), eq(pendencia.responsavel, '')),
        ),
      )
      .orderBy(pendencia.dataLimite, pendencia.createdAt)
      .limit(1);

    if (!next) {
      throw new NotFoundException('Nenhuma pendência disponível na fila.');
    }

    const [updated] = await this.drizzle.db
      .update(pendencia)
      .set({ responsavel: usuarioNome || usuarioId })
      .where(
        and(eq(pendencia.escritorioId, escritorioId), eq(pendencia.id, next.id)),
      )
      .returning();

    return updated;
  }

  cumprir(escritorioId: string, id: string, dto: CumprirPendenciaDto) {
    return this.pendencias.cumprir(escritorioId, id, dto);
  }
}
