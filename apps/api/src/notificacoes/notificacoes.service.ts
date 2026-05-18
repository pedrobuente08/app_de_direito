import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { notificacao } from '../db/schema/notificacao';

@Injectable()
export class NotificacoesService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar(
    escritorioId: string,
    opts?: { usuarioId?: string; apenasNaoLidas?: boolean },
  ) {
    const conds = [eq(notificacao.escritorioId, escritorioId)];
    if (opts?.usuarioId) {
      conds.push(eq(notificacao.usuarioId, opts.usuarioId));
    }
    if (opts?.apenasNaoLidas) {
      conds.push(isNull(notificacao.lidaEm));
    }

    return this.drizzle.db
      .select()
      .from(notificacao)
      .where(and(...conds))
      .orderBy(desc(notificacao.createdAt))
      .limit(200);
  }

  async marcarLida(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .update(notificacao)
      .set({ lidaEm: new Date() })
      .where(
        and(eq(notificacao.escritorioId, escritorioId), eq(notificacao.id, id)),
      )
      .returning();
    if (!row) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return row;
  }

  async marcarTodasLidas(escritorioId: string, usuarioId: string) {
    await this.drizzle.db
      .update(notificacao)
      .set({ lidaEm: new Date() })
      .where(
        and(
          eq(notificacao.escritorioId, escritorioId),
          eq(notificacao.usuarioId, usuarioId),
          isNull(notificacao.lidaEm),
        ),
      );
    return { ok: true };
  }
}
