import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { processoReprotocolo } from '../db/schema/processo-reprotocolo';
import { sentenca } from '../db/schema/sentenca';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { FaseDerivada } from '../fase-derivacao/fase-derivacao.constants';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { ProcessosService } from './processos.service';
import type { PosExtincaoDto } from './dto/pos-extincao.dto';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

function addDaysYmd(baseYmd: string, days: number): string {
  const d = new Date(`${baseYmd.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class PosExtincaoService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly faseDerivacao: FaseDerivacaoService,
  ) {}

  async aplicar(escritorioId: string, processoId: string, dto: PosExtincaoDto) {
    await this.processos.obterPorId(escritorioId, processoId);

    const [sent] = await this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.id, dto.sentencaId),
          eq(sentenca.processoId, processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .limit(1);

    if (!sent) {
      throw new NotFoundException('Sentença não encontrada neste processo.');
    }
    const res = norm(sent.resultado);
    if (!res.includes('EXTINTO')) {
      throw new BadRequestException(
        'O pop-up pós-extinção exige sentença de extinção sem mérito.',
      );
    }

    const motivo = dto.motivo.trim();
    const obs = dto.observacao?.trim() || null;
    const hoje = hojeYmd();

    await this.drizzle.db
      .update(sentenca)
      .set({
        extincaoModalidade: dto.modalidade,
        motivoExtincao: motivo,
        observacoes: obs ?? sent.observacoes,
      })
      .where(eq(sentenca.id, sent.id));

    if (dto.modalidade === 'SEM_CUSTAS' || dto.modalidade === 'DESISTENCIA_SEM_ONUS') {
      await this.drizzle.db
        .insert(processoReprotocolo)
        .values({
          processoId,
          escritorioId,
          subEstado: 'AGUARDANDO_ANALISE',
          modalidadeExtincao: dto.modalidade,
          motivoExtincao: motivo,
          dataExtincao: sent.data,
          observacoes: obs,
        })
        .onConflictDoUpdate({
          target: processoReprotocolo.processoId,
          set: {
            subEstado: 'AGUARDANDO_ANALISE',
            modalidadeExtincao: dto.modalidade,
            motivoExtincao: motivo,
            dataExtincao: sent.data,
            observacoes: obs,
          },
        });

      await this.encadeamentos.dispatch(
        escritorioId,
        'extinto_sem_merito_sem_custas',
        { processoId, observacao: obs },
      );
    } else if (dto.modalidade === 'COM_CUSTAS' || dto.modalidade === 'DESISTENCIA_COM_ONUS') {
      await this.drizzle.db
        .insert(processoReprotocolo)
        .values({
          processoId,
          escritorioId,
          subEstado: 'AGUARDANDO_ISENCAO_CUSTAS',
          modalidadeExtincao: dto.modalidade,
          motivoExtincao: motivo,
          dataExtincao: sent.data,
          dataIsencaoPedida: hoje,
          observacoes: obs,
        })
        .onConflictDoUpdate({
          target: processoReprotocolo.processoId,
          set: {
            subEstado: 'AGUARDANDO_ISENCAO_CUSTAS',
            modalidadeExtincao: dto.modalidade,
            motivoExtincao: motivo,
            dataExtincao: sent.data,
            dataIsencaoPedida: hoje,
            observacoes: obs,
          },
        });

      await this.encadeamentos.dispatch(
        escritorioId,
        'extinto_sem_merito_com_custas',
        { processoId, observacao: obs },
      );
    } else if (dto.modalidade === 'RENUNCIA_DIREITO') {
      await this.drizzle.db
        .update(processo)
        .set({
          statusProcesso: 'ARQUIVADO',
          faseAtual: 'ENCERRADO',
          situacaoFinal: 'RENUNCIA_DIREITO',
          updatedAt: new Date(),
        })
        .where(eq(processo.id, processoId));
    } else {
      await this.drizzle.db
        .update(processo)
        .set({
          faseAtual: FaseDerivada.EM_RECURSO,
          updatedAt: new Date(),
        })
        .where(eq(processo.id, processoId));

      await this.encadeamentos.dispatch(
        escritorioId,
        'extinto_sem_merito_ma_fe',
        { processoId, observacao: obs },
      );
    }

    await this.faseDerivacao.aplicarAposMutacao(escritorioId, processoId);
    return this.processos.obterPorId(escritorioId, processoId);
  }
}
