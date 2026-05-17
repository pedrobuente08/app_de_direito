import { Injectable } from '@nestjs/common';
import { parseComplementoLote } from './complemento.parser';

@Injectable()
export class MigracaoProcedentesService {
  previewComplementos(linhas: string[]) {
    const parsed = parseComplementoLote(linhas.filter((l) => l.trim()));
    const auto = parsed.filter((p) => p.confianca >= 0.8).length;
    return {
      total: parsed.length,
      autoMapeaveis: auto,
      pctAuto: parsed.length
        ? Math.round((auto / parsed.length) * 1000) / 10
        : 0,
      candidatos: parsed,
    };
  }
}
