import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  audiencia,
  audienciaHistorico,
  audienciaLixeira,
} from '../db/schema/audiencia';
import { processo } from '../db/schema/processo';
import { parseCsvSimple } from '../importacao/csv-parse';
import type { CreateAudienciaDto } from './dto/create-audiencia.dto';
import type { FinalizarAudienciaDto } from './dto/finalizar-audiencia.dto';
import type { UpdateAudienciaDto } from './dto/update-audiencia.dto';

const LIXEIRA = new Set(['CANCELADA', 'ADIADA', 'REDESIGNADA']);

/** Normaliza `date` do Postgres / Drizzle para YYYY-MM-DD. */
function formatDateYmdForAudSync(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
      return t.slice(0, 10);
    }
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
    if (br) {
      return `${br[3]}-${br[2]}-${br[1]}`;
    }
    return null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/** Normaliza `time` / string para HH:mm aceito pelo DTO. */
function formatTimeHhMmForAudSync(v: unknown): string | null {
  if (v == null) {
    return null;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    const m = t.match(/^([01]\d|2[0-3]):[0-5]\d/);
    return m ? m[0] : null;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const h = String(v.getUTCHours()).padStart(2, '0');
    const min = String(v.getUTCMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  return null;
}

@Injectable()
export class AudienciasService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select()
      .from(audiencia)
      .where(eq(audiencia.escritorioId, escritorioId))
      .orderBy(desc(audiencia.data), desc(audiencia.createdAt))
      .limit(limit);
  }

  private async assertProcesso(escritorioId: string, processoId: string) {
    const [p] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, processoId),
        ),
      )
      .limit(1);
    if (!p) {
      throw new BadRequestException('Processo não encontrado neste escritório.');
    }
  }

  async criar(escritorioId: string, dto: CreateAudienciaDto) {
    await this.assertProcesso(escritorioId, dto.processoId);
    try {
      const [row] = await this.drizzle.db
        .insert(audiencia)
        .values({
          escritorioId,
          processoId: dto.processoId,
          tipo: dto.tipo?.trim() || null,
          data: dto.data,
          hora: dto.hora ?? null,
          pautista: dto.pautista?.trim() || null,
          status: (dto.status ?? 'AGENDADA').trim(),
          obsPre: dto.obsPre?.trim() || null,
          obsPos: dto.obsPos?.trim() || null,
          link: dto.link?.trim() || null,
        })
        .returning();
      if (!row) {
        throw new ConflictException('Falha ao criar audiência');
      }
      return row;
    } catch (e) {
      if (e instanceof ConflictException || e instanceof BadRequestException) {
        throw e;
      }
      throw new ConflictException(
        'Audiência duplicada para processo + data neste escritório.',
      );
    }
  }

  /**
   * Após extração do PDF (upsert do processo): garante linha em `audiencia`
   * para a data extraída (única por escritório + processo + data).
   * Atualiza tipo/hora se já existir; não altera status (ex.: REALIZADA).
   */
  async sincronizarDaExtracaoPdf(
    escritorioId: string,
    processoId: string,
    row: {
      dataAudiencia: unknown;
      horaAudiencia: unknown;
      tipoAudiencia: string | null;
    },
  ): Promise<void> {
    const dataYmd = formatDateYmdForAudSync(row.dataAudiencia);
    if (!dataYmd) {
      return;
    }
    await this.assertProcesso(escritorioId, processoId);
    const horaHhMm = formatTimeHhMmForAudSync(row.horaAudiencia);
    const tipo = row.tipoAudiencia?.trim() || null;

    const [existing] = await this.drizzle.db
      .select()
      .from(audiencia)
      .where(
        and(
          eq(audiencia.escritorioId, escritorioId),
          eq(audiencia.processoId, processoId),
          eq(audiencia.data, dataYmd),
        ),
      )
      .limit(1);

    if (existing) {
      await this.drizzle.db
        .update(audiencia)
        .set({
          tipo,
          hora: horaHhMm ?? null,
        })
        .where(eq(audiencia.id, existing.id));
      return;
    }

    try {
      await this.criar(escritorioId, {
        processoId,
        data: dataYmd,
        hora: horaHhMm,
        tipo,
        status: 'AGENDADA',
      });
    } catch (e) {
      if (e instanceof ConflictException) {
        const [again] = await this.drizzle.db
          .select()
          .from(audiencia)
          .where(
            and(
              eq(audiencia.escritorioId, escritorioId),
              eq(audiencia.processoId, processoId),
              eq(audiencia.data, dataYmd),
            ),
          )
          .limit(1);
        if (again) {
          await this.drizzle.db
            .update(audiencia)
            .set({
              tipo,
              hora: horaHhMm ?? null,
            })
            .where(eq(audiencia.id, again.id));
          return;
        }
      }
      throw e;
    }
  }

  async obter(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(audiencia)
      .where(
        and(eq(audiencia.escritorioId, escritorioId), eq(audiencia.id, id)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Audiência não encontrada');
    }
    return row;
  }

  async atualizar(escritorioId: string, id: string, dto: UpdateAudienciaDto) {
    await this.obter(escritorioId, id);
    const patch: Partial<typeof audiencia.$inferInsert> = {};
    if (dto.tipo !== undefined) {
      patch.tipo = dto.tipo?.trim() || null;
    }
    if (dto.data !== undefined) {
      patch.data = dto.data;
    }
    if (dto.hora !== undefined) {
      patch.hora = dto.hora;
    }
    if (dto.pautista !== undefined) {
      patch.pautista = dto.pautista?.trim() || null;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status.trim();
    }
    if (dto.obsPre !== undefined) {
      patch.obsPre = dto.obsPre?.trim() || null;
    }
    if (dto.obsPos !== undefined) {
      patch.obsPos = dto.obsPos?.trim() || null;
    }
    if (dto.link !== undefined) {
      patch.link = dto.link?.trim() || null;
    }
    if (!Object.keys(patch).length) {
      throw new BadRequestException('Informe ao menos um campo.');
    }
    await this.drizzle.db
      .update(audiencia)
      .set(patch)
      .where(
        and(eq(audiencia.escritorioId, escritorioId), eq(audiencia.id, id)),
      );
    return this.obter(escritorioId, id);
  }

  async finalizar(
    escritorioId: string,
    id: string,
    dto: FinalizarAudienciaDto,
  ) {
    const current = await this.obter(escritorioId, id);
    const obs = dto.obsPos.trim();
    if (!obs) {
      throw new BadRequestException('obsPos é obrigatório para finalizar.');
    }
    const status = (dto.status ?? 'REALIZADA').trim().toUpperCase();

    if (status === 'REALIZADA') {
      await this.drizzle.db.transaction(async (tx) => {
        await tx.insert(audienciaHistorico).values({
          audienciaIdOrigem: current.id,
          escritorioId,
          processoId: current.processoId,
          tipo: current.tipo,
          data: current.data,
          hora: current.hora,
          pautista: current.pautista,
          status,
          obsPre: current.obsPre,
          obsPos: obs,
          link: current.link,
          createdAtOrigem: current.createdAt,
        });
        await tx
          .delete(audiencia)
          .where(
            and(
              eq(audiencia.escritorioId, escritorioId),
              eq(audiencia.id, id),
            ),
          );
      });
      const [last] = await this.drizzle.db
        .select()
        .from(audienciaHistorico)
        .where(eq(audienciaHistorico.audienciaIdOrigem, current.id))
        .orderBy(desc(audienciaHistorico.archivedAt))
        .limit(1);
      return { movidoPara: 'historico', registro: last };
    }

    if (LIXEIRA.has(status)) {
      await this.drizzle.db.transaction(async (tx) => {
        await tx.insert(audienciaLixeira).values({
          audienciaIdOrigem: current.id,
          escritorioId,
          processoId: current.processoId,
          tipo: current.tipo,
          data: current.data,
          hora: current.hora,
          pautista: current.pautista,
          status,
          obsPre: current.obsPre,
          obsPos: obs,
          link: current.link,
          createdAtOrigem: current.createdAt,
        });
        await tx
          .delete(audiencia)
          .where(
            and(
              eq(audiencia.escritorioId, escritorioId),
              eq(audiencia.id, id),
            ),
          );
      });
      const [last] = await this.drizzle.db
        .select()
        .from(audienciaLixeira)
        .where(eq(audienciaLixeira.audienciaIdOrigem, current.id))
        .orderBy(desc(audienciaLixeira.discardedAt))
        .limit(1);
      return { movidoPara: 'lixeira', registro: last };
    }

    throw new BadRequestException(
      'Status inválido para finalizar. Use REALIZADA, CANCELADA, ADIADA ou REDESIGNADA.',
    );
  }

  async importarCsv(escritorioId: string, csv: string) {
    const linhas = parseCsvSimple(csv);
    const erros: { linha: number; mensagem: string }[] = [];
    let importados = 0;

    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      const processoId = (row.processo_id ?? '').trim();
      const data = (row.data ?? '').trim();
      if (!processoId || !data) {
        erros.push({
          linha: i + 2,
          mensagem: 'processo_id e data (YYYY-MM-DD) são obrigatórios.',
        });
        continue;
      }
      try {
        await this.criar(escritorioId, {
          processoId,
          data,
          hora: row.hora?.trim() || null,
          tipo: row.tipo?.trim() || null,
          pautista: row.pautista?.trim() || null,
          status: row.status?.trim() || undefined,
          obsPre: row.obs_pre?.trim() || null,
          obsPos: row.obs_pos?.trim() || null,
          link: row.link?.trim() || null,
        });
        importados += 1;
      } catch (e) {
        erros.push({ linha: i + 2, mensagem: (e as Error).message });
      }
    }

    return { importados, erros, totalLinhas: linhas.length };
  }
}
