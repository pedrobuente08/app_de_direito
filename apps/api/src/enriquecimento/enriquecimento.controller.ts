import { Controller, Post } from '@nestjs/common';
import { and, eq, or, isNull, sql } from 'drizzle-orm';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { DrizzleService } from '../db/drizzle.service';
import { oabEscuta } from '../db/schema/oab-escuta';
import { processo } from '../db/schema/processo';
import { EnriquecimentoQueueService } from './enriquecimento-queue.service';

@Controller('enriquecimento')
export class EnriquecimentoController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly queue: EnriquecimentoQueueService,
  ) {}

  /**
   * Re-enfileira processos com clienteNome nulo ou formado apenas por iniciais (ex: C. D. S. P.).
   * Usa o login do processo como OAB; quando ausente, usa a primeira OAB cadastrada do escritório.
   */
  @Post('reenriquecer-nomes')
  @Roles('admin', 'adm')
  async reenriquecerNomes(@CurrentUser() user: AuthUser) {
    const { escritorioId } = user;

    const [oabRow] = await this.drizzle.db
      .select({ oab: oabEscuta.oab })
      .from(oabEscuta)
      .where(eq(oabEscuta.escritorioId, escritorioId))
      .limit(1);

    const oabFallback = oabRow?.oab ?? null;

    const processos = await this.drizzle.db
      .select({ id: processo.id, numero: processo.numero, login: processo.login })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          or(
            isNull(processo.clienteNome),
            sql`${processo.clienteNome} ~ '^([A-ZÀ-Ú]\\. )*[A-ZÀ-Ú]\\.$'`,
          ),
        ),
      );

    let enfileirados = 0;
    for (const proc of processos) {
      const rawOab = proc.login ?? oabFallback;
      if (!rawOab) continue;

      const parts = rawOab.split('/');
      const oab = parts[0]?.trim() ?? '';
      const ufOab = parts[1]?.trim() ?? '';
      if (!oab) continue;

      await this.queue.enfileirar({
        processoId: proc.id,
        escritorioId,
        numeroProcesso: proc.numero,
        oab,
        ufOab,
      });
      enfileirados++;
    }

    return { total: processos.length, enfileirados };
  }
}
