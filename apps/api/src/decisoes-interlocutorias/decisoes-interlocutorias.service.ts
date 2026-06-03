import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { AddonsService } from '../addons/addons.service';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import type { EncadeamentoEvento } from '../encadeamentos/encadeamentos.types';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { ProcessosService } from '../processos/processos.service';
import type { ClassificarInterlocutoriaDto } from './dto/classificar-interlocutoria.dto';

const EVENTO_POR_TIPO: Record<
  ClassificarInterlocutoriaDto['tipo'],
  EncadeamentoEvento
> = {
  TUTELA_DEFERIDA: 'interlocutoria_tutela_deferida',
  TUTELA_INDEFERIDA: 'interlocutoria_tutela_indeferida',
  EMENDA_INICIAL: 'interlocutoria_emenda_inicial',
  JUNTADA_DOCUMENTOS: 'interlocutoria_juntada_documentos',
  CITACAO_REALIZADA: 'interlocutoria_citacao_realizada',
  SANEAMENTO: 'interlocutoria_saneamento',
  OUTRO_INTERLOCUTORIO: 'interlocutoria_outro',
};

const FASE_POR_TIPO: Partial<Record<ClassificarInterlocutoriaDto['tipo'], string>> = {
  CITACAO_REALIZADA: 'AGUARDANDO_CONTESTACAO',
  SANEAMENTO: 'EM_SANEAMENTO',
};

@Injectable()
export class DecisoesInterlocutoriasService {
  constructor(
    private readonly addons: AddonsService,
    private readonly processos: ProcessosService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly notificacoes: NotificacoesService,
    private readonly drizzle: DrizzleService,
  ) {}

  async classificar(escritorioId: string, dto: ClassificarInterlocutoriaDto) {
    await this.addons.assertEnabled(escritorioId, 'recursos_avancados');
    const proc = await this.processos.obterPorId(escritorioId, dto.processoId);

    const obs = [
      dto.conteudo?.trim(),
      dto.observacoes?.trim(),
      dto.prazoCumprimento ? `Prazo: ${dto.prazoCumprimento}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const evento = EVENTO_POR_TIPO[dto.tipo];
    await this.encadeamentos.dispatch(escritorioId, evento, {
      processoId: dto.processoId,
      observacao: obs || null,
    });

    const faseNova = FASE_POR_TIPO[dto.tipo];
    if (faseNova) {
      await this.drizzle.db
        .update(processo)
        .set({ faseAtual: faseNova, updatedAt: new Date() })
        .where(
          and(
            eq(processo.id, dto.processoId),
            eq(processo.escritorioId, escritorioId),
          ),
        );
    }

    if (dto.tipo === 'TUTELA_DEFERIDA') {
      await this.notificacoes.criar({
        escritorioId,
        fila: 'ADV',
        tipoGatilho: 'interlocutoria_tutela_deferida',
        entidade: 'processo',
        entidadeId: dto.processoId,
        titulo: 'Tutela deferida',
        mensagem: `Processo ${proc.numero}: tutela antecipada deferida — monitorar cumprimento.`,
        prioridade: 'ALTA',
      });
    }

    return {
      processoId: dto.processoId,
      tipo: dto.tipo,
      evento,
      faseAtual: faseNova ?? proc.faseAtual,
    };
  }
}
