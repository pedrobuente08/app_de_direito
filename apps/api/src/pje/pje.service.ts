import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { AddonsService } from '../addons/addons.service';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { processoProducaoProbatoria } from '../db/schema/processo-producao-probatoria';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { EscritorioService } from '../escritorio/escritorio.service';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { ProcessosService } from '../processos/processos.service';

const PJE_SISTEMAS = new Set(['PJE_TJBA', 'PJE_FED', 'PJE']);

const COMUNICA_PJE: Record<
  string,
  { fase?: string; evento?: Parameters<EncadeamentosQueueService['dispatch']>[1] }
> = {
  CITACAO_REALIZADA: { fase: 'AGUARDANDO_CONTESTACAO', evento: 'interlocutoria_citacao_realizada' },
  CONTESTACAO_JUNTADA: { fase: 'AGUARDANDO_REPLICA', evento: 'pje_contestacao_juntada' },
  SANEAMENTO_PUBLICADO: { fase: 'AGUARDANDO_SANEAMENTO', evento: 'pje_saneamento_publicado' },
  AUDIENCIA_INSTRUCAO_DESIGNADA: { fase: 'AGUARDANDO_AUDIENCIA_INSTRUCAO' },
};

@Injectable()
export class PjeService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly addons: AddonsService,
    private readonly processos: ProcessosService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly escritorio: EscritorioService,
  ) {}

  async listarProducao(escritorioId: string, processoId: string) {
    await this.addons.assertEnabled(escritorioId, 'justica_comum_pje');
    await this.processos.obterPorId(escritorioId, processoId);
    return this.drizzle.db
      .select()
      .from(processoProducaoProbatoria)
      .where(
        and(
          eq(processoProducaoProbatoria.escritorioId, escritorioId),
          eq(processoProducaoProbatoria.processoId, processoId),
        ),
      )
      .orderBy(desc(processoProducaoProbatoria.createdAt));
  }

  async criarProducao(
    escritorioId: string,
    processoId: string,
    dto: {
      tipo: string;
      status?: string;
      dataDesignacao?: string;
      peritoNome?: string;
      observacoes?: string;
    },
  ) {
    await this.addons.assertEnabled(escritorioId, 'justica_comum_pje');
    await this.processos.obterPorId(escritorioId, processoId);
    const [row] = await this.drizzle.db
      .insert(processoProducaoProbatoria)
      .values({
        escritorioId,
        processoId,
        tipo: dto.tipo,
        status: dto.status ?? 'AGUARDANDO',
        dataDesignacao: dto.dataDesignacao ?? null,
        peritoNome: dto.peritoNome?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
      })
      .returning();

    await this.drizzle.db
      .update(processo)
      .set({ faseAtual: 'EM_PRODUCAO_PROBATORIA', updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      );

    return row;
  }

  async atualizarProducao(
    escritorioId: string,
    id: string,
    dto: Partial<{
      status: string;
      dataDesignacao: string;
      dataConclusao: string;
      peritoNome: string;
      observacoes: string;
    }>,
  ) {
    await this.addons.assertEnabled(escritorioId, 'justica_comum_pje');
    const [updated] = await this.drizzle.db
      .update(processoProducaoProbatoria)
      .set({
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dataDesignacao !== undefined
          ? { dataDesignacao: dto.dataDesignacao }
          : {}),
        ...(dto.dataConclusao !== undefined
          ? { dataConclusao: dto.dataConclusao }
          : {}),
        ...(dto.peritoNome !== undefined
          ? { peritoNome: dto.peritoNome?.trim() || null }
          : {}),
        ...(dto.observacoes !== undefined
          ? { observacoes: dto.observacoes?.trim() || null }
          : {}),
      })
      .where(
        and(
          eq(processoProducaoProbatoria.id, id),
          eq(processoProducaoProbatoria.escritorioId, escritorioId),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException('Produção probatória não encontrada.');
    return updated;
  }

  /** Chamado pelo Comunica quando add-on PJE ativo. */
  async aplicarTipoComunicaPje(
    escritorioId: string,
    processoId: string,
    tipoNorm: string,
  ): Promise<boolean> {
    if (!(await this.addons.isEnabled(escritorioId, 'justica_comum_pje'))) {
      return false;
    }
    const proc = await this.processos.obterPorId(escritorioId, processoId);
    const sis = (proc.sistema ?? '').trim().toUpperCase();
    if (!PJE_SISTEMAS.has(sis) && !sis.includes('PJE')) return false;

    const cfg = COMUNICA_PJE[tipoNorm];
    if (!cfg) return false;

    if (cfg.fase) {
      await this.drizzle.db
        .update(processo)
        .set({ faseAtual: cfg.fase, updatedAt: new Date() })
        .where(
          and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
        );
    }
    if (cfg.evento) {
      await this.encadeamentos.dispatch(escritorioId, cfg.evento, { processoId });
    }
    return true;
  }

  async classificarExecucaoOrgaoPublico(
    escritorioId: string,
    processoId: string,
    valorSentenca: number,
  ) {
    if (!(await this.addons.isEnabled(escritorioId, 'justica_comum_pje'))) return;

    const tenant = await this.escritorio.obterPerfilTenant(escritorioId);
    const cfg = (tenant.config ?? {}) as EscritorioConfig;
    const sm = cfg.salario_minimo_atual ?? 1412;
    const limite = sm * 60;
    const modalidade = valorSentenca <= limite ? 'RPV' : 'PRECATORIO';
    const fase =
      modalidade === 'RPV'
        ? 'AGUARDANDO_EXPEDICAO_RPV'
        : 'AGUARDANDO_EXPEDICAO_PRECATORIO';

    await this.drizzle.db
      .update(processo)
      .set({ faseAtual: fase, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      );

    const { processoProcedente } = await import('../db/schema/processo-procedente');
    await this.drizzle.db
      .update(processoProcedente)
      .set({
        execucaoContraOrgaoPublico: true,
        modalidadeExecucaoPub: modalidade,
        updatedAt: new Date(),
      })
      .where(eq(processoProcedente.processoId, processoId));
  }
}
