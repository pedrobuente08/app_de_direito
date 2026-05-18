import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { notificacao } from '../db/schema/notificacao';
import { MailService } from '../mail/mail.service';

export type CriarNotificacaoInput = {
  escritorioId: string;
  usuarioId?: string | null;
  fila?: string | null;
  tipoGatilho: string;
  entidade?: string | null;
  entidadeId?: string | null;
  titulo: string;
  mensagem: string;
  prioridade?: string;
  enviarEmail?: boolean;
};

@Injectable()
export class NotificacoesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly mail: MailService,
  ) {}

  async criar(input: CriarNotificacaoInput) {
    const conteudo = {
      titulo: input.titulo,
      mensagem: input.mensagem,
    };

    const [inApp] = await this.drizzle.db
      .insert(notificacao)
      .values({
        escritorioId: input.escritorioId,
        usuarioId: input.usuarioId ?? null,
        fila: input.fila ?? null,
        tipoGatilho: input.tipoGatilho,
        entidade: input.entidade ?? null,
        entidadeId: input.entidadeId ?? null,
        canal: 'IN_APP',
        prioridade: input.prioridade ?? 'MEDIA',
        conteudo,
        enviadaEm: new Date(),
      })
      .returning();

    if (input.enviarEmail && this.mail.isEnabled()) {
      await this.mail.send({
        subject: `[CONECTAR] ${input.titulo}`,
        text: input.mensagem,
        html: `<p>${input.mensagem}</p>`,
      });
      await this.drizzle.db.insert(notificacao).values({
        escritorioId: input.escritorioId,
        usuarioId: input.usuarioId ?? null,
        tipoGatilho: input.tipoGatilho,
        entidade: input.entidade ?? null,
        entidadeId: input.entidadeId ?? null,
        canal: 'EMAIL',
        prioridade: input.prioridade ?? 'MEDIA',
        conteudo,
        enviadaEm: new Date(),
      });
    }

    return inApp;
  }

  listar(
    escritorioId: string,
    opts?: { usuarioId?: string; apenasNaoLidas?: boolean },
  ) {
    const conds = [
      eq(notificacao.escritorioId, escritorioId),
      eq(notificacao.canal, 'IN_APP'),
    ];
    if (opts?.usuarioId) {
      conds.push(
        or(
          isNull(notificacao.usuarioId),
          eq(notificacao.usuarioId, opts.usuarioId),
        )!,
      );
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

  async contarNaoLidas(escritorioId: string, usuarioId: string) {
    const [row] = await this.drizzle.db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificacao)
      .where(
        and(
          eq(notificacao.escritorioId, escritorioId),
          eq(notificacao.canal, 'IN_APP'),
          isNull(notificacao.lidaEm),
          or(
            isNull(notificacao.usuarioId),
            eq(notificacao.usuarioId, usuarioId),
          )!,
        ),
      );
    return { naoLidas: Number(row?.total ?? 0) };
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
          eq(notificacao.canal, 'IN_APP'),
          isNull(notificacao.lidaEm),
          or(
            isNull(notificacao.usuarioId),
            eq(notificacao.usuarioId, usuarioId),
          )!,
        ),
      );
    return { ok: true };
  }
}
