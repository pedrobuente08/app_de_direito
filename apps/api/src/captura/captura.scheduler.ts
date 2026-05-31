import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CapturaQueueService } from './captura-queue.service';
import { CapturaService } from './captura.service';

@Injectable()
export class CapturaSchedulerService {
  private readonly log = new Logger(CapturaSchedulerService.name);

  constructor(
    private readonly captura: CapturaService,
    private readonly queue: CapturaQueueService,
  ) {}

  /** Dias úteis às 06h — captura principal DJEN por OAB. */
  @Cron('0 6 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  async capturaManha() {
    await this.agendarCapturas('normal');
  }

  /** Retry às 14h para OABs com falha na captura da manhã. */
  @Cron('0 14 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  async capturaRetry() {
    await this.agendarCapturas('retry');
  }

  private async agendarCapturas(tentativa: 'normal' | 'retry') {
    const oabs = await this.captura.listarOabsEscuta();
    if (!oabs.length) {
      this.log.debug(`Nenhuma OAB cadastrada — captura ${tentativa} ignorada`);
      return;
    }

    this.log.log(`Agendando captura ${tentativa} para ${oabs.length} OAB(s)`);

    const escritoriosVistos = new Set<string>();
    for (const row of oabs) {
      if (!escritoriosVistos.has(row.escritorioId)) {
        await this.captura.registrarInicioAgendado(row.escritorioId);
        escritoriosVistos.add(row.escritorioId);
      }

      if (tentativa === 'retry') {
        const saude = await this.captura.listarSaude(row.escritorioId);
        const djen = saude.find((s) => s.fonte === 'djen');
        if (!djen || djen.falhasConsecutivas <= 0) continue;
      }

      const log = await this.captura.criarLogInicio(row.escritorioId, row.oab);
      await this.queue.enfileirar({
        escritorioId: row.escritorioId,
        oab: row.oab,
        fonte: 'djen',
        tentativa,
        capturaLogId: log.id,
      });
    }
  }
}
