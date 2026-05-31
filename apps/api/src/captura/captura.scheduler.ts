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

  /** Segundo turno às 14h — captura completa para pegar publicações intraday. */
  @Cron('0 14 * * 1-5', { timeZone: 'America/Sao_Paulo' })
  async capturaTarde() {
    await this.agendarCapturas('normal');
  }

  private async agendarCapturas(tentativa: 'normal') {
    const oabs = await this.captura.listarOabsEscuta();
    if (!oabs.length) {
      this.log.debug(`Nenhuma OAB cadastrada — captura ignorada`);
      return;
    }

    this.log.log(`Agendando captura para ${oabs.length} OAB(s)`);

    const escritoriosVistos = new Set<string>();
    for (const row of oabs) {
      if (!escritoriosVistos.has(row.escritorioId)) {
        await this.captura.registrarInicioAgendado(row.escritorioId);
        escritoriosVistos.add(row.escritorioId);
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
