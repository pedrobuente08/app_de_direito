import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import {
  processoProcedente,
  procedenteTransicao,
} from '../db/schema/processo-procedente';
import type { UpdateProcedenteDto } from './dto/update-procedente.dto';

const SENT = ['PROCEDENTE', 'PARCIAL', 'ACORDO'] as const;

@Injectable()
export class ProcedentesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select({
        processo,
        procedente: processoProcedente,
      })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          inArray(processo.sentenca, [...SENT]),
        ),
      )
      .limit(limit);
  }

  async obter(escritorioId: string, processoId: string) {
    const [row] = await this.drizzle.db
      .select({ processo, procedente: processoProcedente })
      .from(processo)
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
          inArray(processo.sentenca, [...SENT]),
        ),
      )
      .limit(1);

    if (!row?.processo) {
      throw new NotFoundException(
        'Processo não encontrado ou sem sentença procedente/parcial/acordo.',
      );
    }
    return row;
  }

  async atualizar(
    escritorioId: string,
    processoId: string,
    dto: UpdateProcedenteDto,
    user: AuthUser,
  ) {
    const { procedente: procRow } = await this.obter(escritorioId, processoId);

    if (!procRow) {
      throw new BadRequestException(
        'Linha de procedente ainda não existe — altere a sentença do processo para procedente/parcial/acordo.',
      );
    }

    const patch: Partial<typeof processoProcedente.$inferInsert> = {};
    if (dto.familiaSituacao !== undefined) {
      patch.familiaSituacao = dto.familiaSituacao.trim();
    }
    if (dto.situacao !== undefined) {
      patch.situacao = dto.situacao.trim();
    }
    if (dto.recursoTipo !== undefined) {
      patch.recursoTipo = dto.recursoTipo?.trim() || null;
    }
    if (dto.recursoOrigem !== undefined) {
      patch.recursoOrigem = dto.recursoOrigem?.trim() || null;
    }
    if (dto.recursoResultado !== undefined) {
      patch.recursoResultado = dto.recursoResultado?.trim() || null;
    }
    if (dto.docPendente !== undefined) {
      patch.docPendente = dto.docPendente;
    }
    if (dto.responsavel !== undefined) {
      patch.responsavel = dto.responsavel?.trim() || null;
    }
    if (dto.obsCurta !== undefined) {
      patch.obsCurta = dto.obsCurta?.trim() || null;
    }
    if (dto.dataEstimadaRecebimento !== undefined) {
      patch.dataEstimadaRecebimento = dto.dataEstimadaRecebimento;
    }
    if (dto.valorRecebido !== undefined) {
      patch.valorRecebido = dto.valorRecebido;
    }
    if (dto.dataRecebimento !== undefined) {
      patch.dataRecebimento = dto.dataRecebimento;
    }

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Informe ao menos um campo.');
    }

    const situacaoAnterior = procRow.situacao;
    const situacaoNova =
      dto.situacao !== undefined ? dto.situacao.trim() : procRow.situacao;

    patch.ultimoVisto = new Date();
    patch.updatedAt = new Date();

    await this.drizzle.db
      .update(processoProcedente)
      .set(patch)
      .where(eq(processoProcedente.processoId, processoId));

    if (
      dto.situacao !== undefined &&
      situacaoNova !== situacaoAnterior
    ) {
      await this.drizzle.db.insert(procedenteTransicao).values({
        processoId,
        escritorioId,
        situacaoAnterior,
        situacaoNova,
        origem: 'MANUAL',
        usuarioId: user.userId,
      });
    }

    return this.obter(escritorioId, processoId);
  }
}
