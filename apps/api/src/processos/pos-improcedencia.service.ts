import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { AvaliacaoRecursoJson } from '../db/schema/processo';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { faseHistorico } from '../db/schema/fase-historico';
import { improcedente } from '../db/schema/improcedente';
import { processo } from '../db/schema/processo';
import { sentenca } from '../db/schema/sentenca';
import { EscritorioService } from '../escritorio/escritorio.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { FaseDerivada } from '../fase-derivacao/fase-derivacao.constants';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { ProcessosService } from './processos.service';
import { ProcessosHipossuficienciaService } from './processos-hipossuficiencia.service';
import type { PosImprocedenciaDto } from './dto/pos-improcedencia.dto';

function normResultado(r: string): string {
  return r
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

function isPrimeiroGrau(grau: string | null | undefined): boolean {
  if (!grau?.trim()) return true;
  const g = grau.trim().toUpperCase();
  return !g.includes('SEGUNDO') && g !== 'STJ' && g !== 'TST';
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
export class PosImprocedenciaService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
    private readonly escritorio: EscritorioService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly faseDerivacao: FaseDerivacaoService,
    private readonly hipossuf: ProcessosHipossuficienciaService,
  ) {}

  private async cfg(escritorioId: string): Promise<EscritorioConfig> {
    const row = await this.escritorio.obterPerfilTenant(escritorioId);
    return (row.config ?? {}) as EscritorioConfig;
  }

  async aplicar(
    escritorioId: string,
    processoId: string,
    dto: PosImprocedenciaDto,
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
    if (normResultado(sent.resultado) !== 'IMPROCEDENTE') {
      throw new BadRequestException(
        'O pop-up pós-improcedência só se aplica a sentença IMPROCEDENTE.',
      );
    }
    if (!isPrimeiroGrau(sent.grau)) {
      throw new BadRequestException(
        'Use o fluxo de 2º grau na aba Recursos para sentenças de apelação.',
      );
    }

    const config = await this.cfg(escritorioId);
    const prazoAvaliar =
      dto.prazoDias ?? config.prazo_avaliacao_recurso_dias ?? 7;
    const prazoElaborar = config.prazo_elaborar_recurso_dias ?? 10;
    const obs = dto.observacao?.trim() || null;
    const valor =
      dto.valorSucumbencia?.trim() || sent.valor?.toString() || null;

    const db = this.drizzle.db;

    if (dto.decisao === 'RECORRER') {
      await db.transaction(async (tx) => {
        const [proc] = await tx
          .select({ faseAtual: processo.faseAtual })
          .from(processo)
          .where(eq(processo.id, processoId))
          .limit(1);
        const faseAntes = proc?.faseAtual?.trim() ?? null;
        const faseNova = FaseDerivada.EM_RECURSO;

        await tx
          .update(processo)
          .set({
            faseAtual: faseNova,
            avaliacaoRecurso: null,
            updatedAt: new Date(),
          })
          .where(eq(processo.id, processoId));

        if (faseAntes !== faseNova) {
          await tx.insert(faseHistorico).values({
            processoId,
            escritorioId,
            faseAnterior: faseAntes,
            faseNova,
            origem: 'POS_IMPROCEDENCIA',
            usuarioId: usuarioId ?? null,
          });
        }

        await tx
          .delete(improcedente)
          .where(eq(improcedente.processoId, processoId));

        await tx.insert(improcedente).values({
          escritorioId,
          processoId,
          valorSucumbencia: valor,
          statusPagamento: 'A_PAGAR',
          decisaoRecurso: 'RECORRER',
        });
      });

      await this.encadeamentos.dispatch(escritorioId, 'improcedente_recorrer', {
        processoId,
        observacao: obs,
      });
      await this.hipossuf.garantirPendenciaSeNecessario(
        escritorioId,
        processoId,
        obs,
      );
    } else if (dto.decisao === 'NAO_RECORRER') {
      const prazoPag = addDaysYmd(sent.data, 15);
      await db.transaction(async (tx) => {
        await tx
          .update(processo)
          .set({ avaliacaoRecurso: null, updatedAt: new Date() })
          .where(eq(processo.id, processoId));

        await tx
          .delete(improcedente)
          .where(eq(improcedente.processoId, processoId));

        await tx.insert(improcedente).values({
          escritorioId,
          processoId,
          valorSucumbencia: valor,
          statusPagamento: 'A_PAGAR',
          dataPrazoPagamento: prazoPag,
          decisaoRecurso: 'NAO_RECORRER',
        });
      });
    } else {
      const criado = hojeYmd();
      const prazo = addDaysYmd(criado, prazoAvaliar);
      const avaliacao: AvaliacaoRecursoJson = {
        ativa: true,
        criado_em: criado,
        prazo,
        responsavel: dto.responsavel?.trim() || undefined,
        observacao: obs ?? undefined,
      };

      await db.transaction(async (tx) => {
        await tx
          .update(processo)
          .set({
            avaliacaoRecurso: avaliacao,
            updatedAt: new Date(),
          })
          .where(eq(processo.id, processoId));

        await tx
          .delete(improcedente)
          .where(eq(improcedente.processoId, processoId));

        await tx.insert(improcedente).values({
          escritorioId,
          processoId,
          valorSucumbencia: valor,
          statusPagamento: 'A_PAGAR',
          decisaoRecurso: 'AVALIAR',
        });
      });
    }

    await this.faseDerivacao.aplicarAposMutacao(
      escritorioId,
      processoId,
      usuarioId,
    );

    return this.processos.obterPorId(escritorioId, processoId);
  }
}
