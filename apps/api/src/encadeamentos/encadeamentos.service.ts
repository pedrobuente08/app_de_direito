import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { processo } from '../db/schema/processo';
import { PendenciasService } from '../pendencias/pendencias.service';
import { CalcularPrazoProcessualService } from './calcular-prazo-processual.service';
import { ENCADEAMENTO_PENDENCIAS } from './encadeamentos.registry';
import type { EncadeamentoEvento } from './encadeamentos.types';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class EncadeamentosService {
  private readonly log = new Logger(EncadeamentosService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pendencias: PendenciasService,
    private readonly prazos: CalcularPrazoProcessualService,
  ) {}

  private async encadeamentoAtivo(
    escritorioId: string,
    evento: EncadeamentoEvento,
  ): Promise<boolean> {
    const [row] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);
    const cfg = (row?.config ?? {}) as EscritorioConfig;
    const map = cfg.encadeamentos;
    if (!map || typeof map !== 'object') return true;
    const v = map[evento];
    return v !== false;
  }

  async executar(
    escritorioId: string,
    evento: EncadeamentoEvento,
    opts: { processoId: string; observacao?: string | null },
  ): Promise<{ criadas: number; ignorado?: boolean }> {
    if (!(await this.encadeamentoAtivo(escritorioId, evento))) {
      this.log.debug(`Encadeamento ${evento} desativado para ${escritorioId}`);
      return { criadas: 0, ignorado: true };
    }

    const [proc] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(eq(processo.id, opts.processoId), eq(processo.escritorioId, escritorioId)),
      )
      .limit(1);
    if (!proc) {
      this.log.warn(`Processo ${opts.processoId} não encontrado — cascata ${evento}`);
      return { criadas: 0 };
    }

    const specs = ENCADEAMENTO_PENDENCIAS[evento] ?? [];
    const base = hojeYmd();
    const obs = opts.observacao?.trim() || null;
    let criadas = 0;

    for (const spec of specs) {
      try {
        const dataLimite = await this.prazos.calcular(
          escritorioId,
          spec.dias,
          base,
        );
        await this.pendencias.criar(escritorioId, {
          processoId: opts.processoId,
          tipo: spec.tipo,
          dataLimite,
          responsavel: spec.responsavel ?? null,
          fila: spec.fila ?? null,
          observacao: obs,
          origem: 'ENCADEAMENTO',
        });
        criadas += 1;
      } catch (e) {
        this.log.warn(
          `Pendência ${spec.tipo} não criada (${evento}): ${(e as Error).message}`,
        );
      }
    }

    return { criadas };
  }
}
