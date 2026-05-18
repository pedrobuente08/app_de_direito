import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { pendencia, pendenciaProblema } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import type { AvaliacaoRecursoJson } from '../db/schema/processo';
import type { JusticaGratuitaProcessoDto } from './dto/justica-gratuita-processo.dto';
import type { PatchAvaliacaoRecursoDto } from './dto/patch-avaliacao-recurso.dto';
import type { SobrestarProcessoDto } from './dto/sobrestar-processo.dto';

function addYearsIso(dateIso: string, years: number): string {
  const d = new Date(`${dateIso}T12:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class ProcessosWorkflowService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async assertProcesso(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(processo)
      .where(and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Processo não encontrado');
    }
    return row;
  }

  async sobrestar(escritorioId: string, id: string, dto: SobrestarProcessoDto) {
    await this.assertProcesso(escritorioId, id);
    const motivo = dto.motivo.trim();
    if (!motivo) {
      throw new BadRequestException('Informe o motivo do sobrestamento.');
    }

    const abertas = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, id),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    await this.drizzle.db.transaction(async (tx) => {
      for (const p of abertas) {
        await tx.insert(pendenciaProblema).values({
          pendenciaIdOrigem: p.id,
          escritorioId,
          processoId: p.processoId,
          tipo: p.tipo,
          dataAbertura: p.dataAbertura,
          dataLimite: p.dataLimite,
          solicitante: p.solicitante,
          responsavel: p.responsavel,
          status: 'SOBRESTADO',
          observacao: p.observacao,
          origem: p.origem,
          createdAtOrigem: p.createdAt,
        });
        await tx
          .delete(pendencia)
          .where(
            and(eq(pendencia.escritorioId, escritorioId), eq(pendencia.id, p.id)),
          );
      }

      await tx
        .update(processo)
        .set({
          statusProcesso: 'SOBRESTADO',
          sobrestamentoMotivo: motivo,
          sobrestadoDesde: dto.sobrestadoDesde.slice(0, 10),
          updatedAt: new Date(),
        })
        .where(
          and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)),
        );
    });

    return this.assertProcesso(escritorioId, id);
  }

  async dessobrestar(escritorioId: string, id: string) {
    await this.assertProcesso(escritorioId, id);
    await this.drizzle.db
      .update(processo)
      .set({
        statusProcesso: 'ATIVO',
        sobrestamentoMotivo: null,
        sobrestadoDesde: null,
        updatedAt: new Date(),
      })
      .where(and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)));
    return this.assertProcesso(escritorioId, id);
  }

  async justicaGratuita(
    escritorioId: string,
    id: string,
    dto: JusticaGratuitaProcessoDto,
  ) {
    const row = await this.assertProcesso(escritorioId, id);
    const hoje = new Date().toISOString().slice(0, 10);
    const patch: Partial<typeof processo.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.operacao === 'CONCEDER') {
      patch.justicaGratuita = true;
      patch.justicaGratuitaConcedidaEm = hoje;
      patch.justicaGratuitaExpiraEm = addYearsIso(hoje, 1);
      patch.justicaGratuitaRevisadaEm = hoje;
    } else if (dto.operacao === 'RENOVAR') {
      if (!row.justicaGratuita) {
        throw new BadRequestException(
          'Justiça gratuita não está concedida neste processo.',
        );
      }
      const base = row.justicaGratuitaExpiraEm ?? hoje;
      patch.justicaGratuitaExpiraEm = addYearsIso(String(base).slice(0, 10), 1);
      patch.justicaGratuitaRevisadaEm = hoje;
    } else {
      patch.justicaGratuita = false;
      patch.justicaGratuitaConcedidaEm = null;
      patch.justicaGratuitaExpiraEm = null;
      patch.justicaGratuitaRevisadaEm = hoje;
    }

    await this.drizzle.db
      .update(processo)
      .set(patch)
      .where(and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)));

    return this.assertProcesso(escritorioId, id);
  }

  async patchAvaliacaoRecurso(
    escritorioId: string,
    id: string,
    dto: PatchAvaliacaoRecursoDto,
  ) {
    await this.assertProcesso(escritorioId, id);
    const avaliacao: AvaliacaoRecursoJson = {
      ativa: dto.ativa,
      criado_em: new Date().toISOString(),
      prazo: dto.prazo?.slice(0, 10) ?? undefined,
      responsavel: dto.responsavel?.trim() || undefined,
      observacao: dto.observacao?.trim() || undefined,
    };

    await this.drizzle.db
      .update(processo)
      .set({
        avaliacaoRecurso: dto.ativa ? avaliacao : null,
        updatedAt: new Date(),
      })
      .where(and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)));

    return this.assertProcesso(escritorioId, id);
  }

  /** Centro de observações — UNION das fontes principais. */
  async listarObservacoes(escritorioId: string, processoId: string) {
    await this.assertProcesso(escritorioId, processoId);

    const rows = await this.drizzle.db.execute<{
      fonte: string;
      texto: string | null;
      data_ref: Date | string | null;
    }>(sql`
      SELECT 'GERAL' AS fonte, COALESCE(p.observacao_geral, p.observacoes) AS texto, p.updated_at AS data_ref
      FROM processo p
      WHERE p.id = ${processoId} AND p.escritorio_id = ${escritorioId}
        AND COALESCE(p.observacao_geral, p.observacoes) IS NOT NULL
        AND TRIM(COALESCE(p.observacao_geral, p.observacoes)) <> ''

      UNION ALL

      SELECT 'PRÉ-AUDIÊNCIA', a.obs_pre, a.created_at
      FROM audiencia a
      WHERE a.processo_id = ${processoId} AND a.escritorio_id = ${escritorioId}
        AND a.obs_pre IS NOT NULL AND TRIM(a.obs_pre) <> ''

      UNION ALL

      SELECT 'PÓS-AUDIÊNCIA', a.obs_pos, COALESCE(a.created_at, NOW())
      FROM audiencia a
      WHERE a.processo_id = ${processoId} AND a.escritorio_id = ${escritorioId}
        AND a.obs_pos IS NOT NULL AND TRIM(a.obs_pos) <> ''

      UNION ALL

      SELECT 'PENDÊNCIA', pen.observacao, pen.created_at
      FROM pendencia pen
      WHERE pen.processo_id = ${processoId} AND pen.escritorio_id = ${escritorioId}
        AND pen.observacao IS NOT NULL AND TRIM(pen.observacao) <> ''

      UNION ALL

      SELECT 'SENTENÇA', s.observacoes, s.data
      FROM sentenca s
      WHERE s.processo_id = ${processoId} AND s.escritorio_id = ${escritorioId}
        AND s.observacoes IS NOT NULL AND TRIM(s.observacoes) <> ''

      UNION ALL

      SELECT 'PROCEDENTE', pp.obs_curta, pp.updated_at
      FROM processo_procedente pp
      WHERE pp.processo_id = ${processoId} AND pp.escritorio_id = ${escritorioId}
        AND pp.obs_curta IS NOT NULL AND TRIM(pp.obs_curta) <> ''

      ORDER BY data_ref DESC NULLS LAST
    `);

    return (rows.rows ?? []).map((r) => ({
      fonte: r.fonte,
      texto: r.texto,
      dataRef: r.data_ref,
    }));
  }
}
