import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';

@Injectable()
export class PainelViewsScheduler {
  private readonly log = new Logger(PainelViewsScheduler.name);

  constructor(private readonly drizzle: DrizzleService) {}

  @Cron('15 4 * * *', { timeZone: 'America/Sao_Paulo' })
  async refreshMaterializedViews(): Promise<void> {
    try {
      await this.drizzle.db.execute(
        sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mat_taxa_exito`,
      );
      await this.drizzle.db.execute(
        sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mat_tempo_sentenca`,
      );
      this.log.log('Materialized views mat_taxa_exito e mat_tempo_sentenca atualizadas');
    } catch (e) {
      this.log.warn(
        `Refresh CONCURRENTLY falhou, tentando refresh simples: ${(e as Error).message}`,
      );
      try {
        await this.drizzle.db.execute(sql`REFRESH MATERIALIZED VIEW mat_taxa_exito`);
        await this.drizzle.db.execute(sql`REFRESH MATERIALIZED VIEW mat_tempo_sentenca`);
      } catch (e2) {
        this.log.error(`Refresh views painel falhou: ${(e2 as Error).message}`);
      }
    }
  }
}
