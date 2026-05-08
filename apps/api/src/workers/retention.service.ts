import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { auditLog } from '../db/schema/audit-log';
import { audienciaHistorico, audienciaLixeira } from '../db/schema/audiencia';
import { comunicacao } from '../db/schema/comunicacao';
import { pendenciaHistorico } from '../db/schema/pendencia';

/** Retenções alinhadas ao briefing (§ 4.2). */
@Injectable()
export class RetentionService {
  private readonly log = new Logger(RetentionService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  @Cron('0 4 * * *')
  async executarDiario() {
    const db = this.drizzle.db;
    try {
      await db.delete(pendenciaHistorico).where(
        lt(pendenciaHistorico.archivedAt, sql`now() - interval '60 days'`),
      );
      await db.delete(audienciaHistorico).where(
        lt(audienciaHistorico.archivedAt, sql`now() - interval '60 days'`),
      );
      await db.delete(audienciaLixeira).where(
        lt(audienciaLixeira.discardedAt, sql`now() - interval '7 days'`),
      );
      await db.delete(comunicacao).where(
        and(
          eq(comunicacao.status, 'ORFA'),
          lt(comunicacao.createdAt, sql`now() - interval '90 days'`),
        ),
      );
      await db.delete(auditLog).where(
        lt(auditLog.createdAt, sql`now() - interval '5 years'`),
      );
      this.log.log('Job de retenção concluído.');
    } catch (e) {
      this.log.error((e as Error).message);
    }
  }
}
