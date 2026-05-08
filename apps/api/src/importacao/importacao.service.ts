import { Injectable } from '@nestjs/common';
import { AudienciasService } from '../audiencias/audiencias.service';
import { PendenciasService } from '../pendencias/pendencias.service';
import { ProcessosService } from '../processos/processos.service';

@Injectable()
export class ImportacaoService {
  constructor(
    private readonly processos: ProcessosService,
    private readonly pendencias: PendenciasService,
    private readonly audiencias: AudienciasService,
  ) {}

  importarProcessosCsv(escritorioId: string, csv: string) {
    return this.processos.importarCsv(escritorioId, csv);
  }

  importarPendenciasCsv(escritorioId: string, csv: string) {
    return this.pendencias.importarCsv(escritorioId, csv);
  }

  importarAudienciasCsv(escritorioId: string, csv: string) {
    return this.audiencias.importarCsv(escritorioId, csv);
  }
}
