import { Controller, Post } from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/metadata';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { EnriquecimentoQueueService } from './enriquecimento-queue.service';

@Controller('enriquecimento')
export class EnriquecimentoController {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly queue: EnriquecimentoQueueService,
  ) {}

  /** Re-enfileira processos cujo clienteNome é composto apenas de iniciais (ex: C. D. S. P.). */
  @Post('reenriquecer-iniciais')
  @Roles('admin', 'adm')
  async reenriquecerIniciais(@CurrentUser() user: AuthUser) {
    const { escritorioId } = user;

    const processos = await this.drizzle.db
      .select({
        id: processo.id,
        numero: processo.numero,
        clienteNome: processo.clienteNome,
        login: processo.login,
      })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          isNotNull(processo.clienteNome),
          // Matches names like "C. D. S. P." where every word is a single letter + period
          sql`${processo.clienteNome} ~ '^([A-ZÀ-Ú]\\. )*[A-ZÀ-Ú]\\.$'`,
        ),
      );

    let enfileirados = 0;
    for (const proc of processos) {
      if (!proc.login) continue;
      const parts = proc.login.split('/');
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
