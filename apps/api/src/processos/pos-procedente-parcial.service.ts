import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { AvaliacaoRecursoJson } from '../db/schema/processo';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { sentenca } from '../db/schema/sentenca';
import { EscritorioService } from '../escritorio/escritorio.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { FaseDerivada } from '../fase-derivacao/fase-derivacao.constants';
import { PendenciasService } from '../pendencias/pendencias.service';
import { ProcessosService } from './processos.service';
import type { PosProcedenteParcialDto } from './dto/pos-procedente-parcial.dto';

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
export class PosProcedenteParcialService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
    private readonly escritorio: EscritorioService,
    private readonly pendencias: PendenciasService,
    private readonly faseDerivacao: FaseDerivacaoService,
  ) {}

  private async cfg(escritorioId: string): Promise<EscritorioConfig> {
    const row = await this.escritorio.obterPerfilTenant(escritorioId);
    return (row.config ?? {}) as EscritorioConfig;
  }

  async aplicar(
    escritorioId: string,
    processoId: string,
    dto: PosProcedenteParcialDto,
    usuarioId?: string | null,
  ) {
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
    if (res !== 'PARCIAL' && !res.includes('PROCEDENTE')) {
      throw new BadRequestException(
        'O pop-up pós-procedente parcial exige sentença PARCIAL ou PROCEDENTE.',
      );
    }

    const config = await this.cfg(escritorioId);
    const prazoAvaliar =
      dto.prazoDias ?? config.prazo_avaliacao_recurso_dias ?? 7;
    const obs = dto.observacao?.trim() || null;
    const valor =
      dto.valorConcedido?.trim() || sent.valor?.toString() || null;
    const hoje = hojeYmd();
    const db = this.drizzle.db;

    const ensureProcedente = async () => {
      await db
        .insert(processoProcedente)
        .values({
          processoId,
          escritorioId,
          familiaSituacao: 'AGUARDAR_TRANSITO',
          situacao: 'AGUARDANDO_TRANSITO',
          obsCurta: obs,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: processoProcedente.processoId,
          set: {
            obsCurta: obs,
            updatedAt: new Date(),
          },
        });
    };

    if (dto.decisao === 'RECORRER_PARA_MAJORAR') {
      await db
        .update(processo)
        .set({
          faseAtual: FaseDerivada.EM_RECURSO,
          avaliacaoRecurso: null,
          updatedAt: new Date(),
        })
        .where(eq(processo.id, processoId));

      await ensureProcedente();

      const prazoRecurso = config.prazo_elaborar_recurso_dias ?? 10;
      await this.pendencias.criar(escritorioId, {
        processoId,
        tipo: 'ELABORAR RECURSO',
        dataLimite: addDaysYmd(hoje, prazoRecurso),
        responsavel: dto.responsavel?.trim() || 'ADV',
        observacao: obs,
        origem: 'MANUAL',
        fila: 'ADV',
      });
      await this.pendencias.criar(escritorioId, {
        processoId,
        tipo: 'SOLICITAR DOC GRATUIDADE',
        dataLimite: addDaysYmd(hoje, 5),
        responsavel: 'TELEMARKETING',
        observacao: obs,
        origem: 'MANUAL',
        fila: 'TELEMARKETING',
      });
    } else if (dto.decisao === 'NAO_RECORRER') {
      await db
        .update(processo)
        .set({ avaliacaoRecurso: null, updatedAt: new Date() })
        .where(eq(processo.id, processoId));
      await ensureProcedente();
    } else {
      const prazo = addDaysYmd(hoje, prazoAvaliar);
      const avaliacao: AvaliacaoRecursoJson = {
        ativa: true,
        criado_em: hoje,
        prazo,
        responsavel: dto.responsavel?.trim() || undefined,
        observacao: obs ?? undefined,
      };
      await db
        .update(processo)
        .set({ avaliacaoRecurso: avaliacao, updatedAt: new Date() })
        .where(eq(processo.id, processoId));
      await ensureProcedente();
    }

    await this.faseDerivacao.aplicarAposMutacao(
      escritorioId,
      processoId,
      usuarioId,
    );
    return this.processos.obterPorId(escritorioId, processoId);
  }
}
