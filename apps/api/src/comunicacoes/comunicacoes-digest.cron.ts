import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { MailService } from '../mail/mail.service';
import { ComunicacoesService } from './comunicacoes.service';

/** E-mail diário com resumo de comunicações (`config.comunica_digest`). */
@Injectable()
export class ComunicacoesDigestCronService {
  private readonly log = new Logger(ComunicacoesDigestCronService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly mail: MailService,
    private readonly comunicacoes: ComunicacoesService,
  ) {}

  @Cron('0 7 * * *')
  async enviarDiario() {
    if (!this.mail.isEnabled()) {
      return;
    }
    const rows = await this.drizzle.db
      .select({ id: escritorio.id, config: escritorio.config, nome: escritorio.nome })
      .from(escritorio)
      .where(eq(escritorio.ativo, true));

    for (const row of rows) {
      const cfg = (row.config ?? {}) as EscritorioConfig;
      const digest = cfg.comunica_digest;
      if (!digest?.enabled || !digest.emails?.length) {
        continue;
      }
      const dias = Math.min(Math.max(digest.dias ?? 1, 1), 30);
      try {
        const resumo = await this.comunicacoes.digest(row.id, dias);
        const html = this.montarHtml(row.nome, dias, resumo);
        const subject = `[CONECTAR] Comunicações — ${row.nome} (${dias}d)`;
        for (const to of digest.emails) {
          const email = to?.trim();
          if (!email) {
            continue;
          }
          await this.mail.send({ to: email, subject, html });
        }
      } catch (e) {
        this.log.warn(
          `Digest escritório ${row.id}: ${(e as Error).message}`,
        );
      }
    }
  }

  private montarHtml(
    nomeEscritorio: string,
    dias: number,
    resumo: Awaited<ReturnType<ComunicacoesService['digest']>>,
  ): string {
    const linhasTipo = resumo.porTipo
      .map((t) => `<li>${t.tipo ?? '(sem tipo)'}: <strong>${t.total}</strong></li>`)
      .join('');
    const linhasStatus = resumo.porStatus
      .map((s) => `<li>${s.status}: <strong>${s.total}</strong></li>`)
      .join('');
    return `
      <p>Resumo de comunicações — <strong>${nomeEscritorio}</strong> (últimos ${dias} dias).</p>
      <p>Total: <strong>${resumo.total}</strong></p>
      <p>Por tipo:</p><ul>${linhasTipo || '<li>—</li>'}</ul>
      <p>Por status:</p><ul>${linhasStatus || '<li>—</li>'}</ul>
    `;
  }
}
