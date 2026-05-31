import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import { ComunicacoesService } from './comunicacoes.service';

/** Tenta re-vincular comunicações ÓRFÃ a processos que foram cadastrados depois. */
@Injectable()
export class ComunicacoesOrfasCronService {
  private readonly log = new Logger(ComunicacoesOrfasCronService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly comunicacoes: ComunicacoesService,
  ) {}

  /** Roda às 08h, após a captura das 06h e após o horário de início do expediente. */
  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async resolverOrfas() {
    const escritorios = await this.drizzle.db
      .select({ id: escritorio.id })
      .from(escritorio)
      .where(eq(escritorio.ativo, true));

    for (const e of escritorios) {
      try {
        const { resolvidas } = await this.comunicacoes.tentarResolverOrfas(e.id);
        if (resolvidas > 0) {
          this.log.log(`Resolvidas ${resolvidas} ÓRFÃ(s) — escritório ${e.id}`);
        }
      } catch (err) {
        this.log.warn(`Falha ao resolver ORFÃs escritório ${e.id}: ${(err as Error).message}`);
      }
    }
  }
}
