import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { CalcularPrazoProcessualService } from '../encadeamentos/calcular-prazo-processual.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import {
  CENARIO_AUDIENCIA_OPCOES,
  type CenarioAudiencia,
} from './dto/finalizar-audiencia.dto';
import {
  audiencia,
  audienciaHistorico,
  audienciaLixeira,
} from '../db/schema/audiencia';
import { audienciaAusente } from '../db/schema/audiencia-ausente';
import { escritorioAdversario } from '../db/schema/escritorio-adversario';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { parseCsvSimple } from '../importacao/csv-parse';
import type { CreateAudienciaDto } from './dto/create-audiencia.dto';
import type { FinalizarAudienciaDto } from './dto/finalizar-audiencia.dto';
import type { UpdateAudienciaDto } from './dto/update-audiencia.dto';

const LIXEIRA = new Set(['CANCELADA', 'ADIADA', 'REDESIGNADA']);

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly faseDerivacao: FaseDerivacaoService,
    private readonly prazos: CalcularPrazoProcessualService,
  ) {}

  async listar(escritorioId: string, limit = 500) {
    const rows = await this.drizzle.db
      .select({
        aud: audiencia,
        procNumero: processo.numero,
        procCliente: processo.clienteNome,
        procTelefone: processo.telefone,
        procReu: processo.reuTexto,
        procMateria: processo.materia,
        procVara: processo.vara,
        procTipoAud: processo.tipoAudiencia,
        procQual: processo.qualidadeCaso,
        procLogin: processo.login,
        advNome: escritorioAdversario.nomeCanonico,
      })
      .from(audiencia)
      .leftJoin(
        processo,
        and(
          eq(audiencia.processoId, processo.id),
          eq(processo.escritorioId, escritorioId),
        ),
      )
      .leftJoin(
        escritorioAdversario,
        eq(audiencia.escritorioAdversarioId, escritorioAdversario.id),
      )
      .where(eq(audiencia.escritorioId, escritorioId))
      .orderBy(desc(audiencia.data), desc(audiencia.createdAt))
      .limit(limit);

    return rows.map(
      ({
        aud,
        procNumero,
        procCliente,
        procTelefone,
        procReu,
        procMateria,
        procVara,
        procTipoAud,
        procQual,
        procLogin,
        advNome,
      }) => ({
        ...aud,
        processo: procNumero
          ? {
              numero: procNumero,
              clienteNome: procCliente,
              telefone: procTelefone,
              reuTexto: procReu,
              materia: procMateria,
              vara: procVara,
              tipoAudiencia: procTipoAud,
              qualidadeCaso: procQual,
              login: procLogin,
            }
          : undefined,
        escritorioAdversarioNome: advNome?.trim() || null,
      }),
    );
  }

  /** E7 — últimos 6 meses (`audiencia_ausente`). */
  async relatorioAusentes6Meses(escritorioId: string) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 6);
    return this.drizzle.db
      .select()
      .from(audienciaAusente)
      .where(
        and(
          eq(audienciaAusente.escritorioId, escritorioId),
          gte(audienciaAusente.createdAt, desde),
        ),
      )
      .orderBy(desc(audienciaAusente.createdAt));
  }

  async resumoAusentes6Meses(escritorioId: string) {
    const rows = await this.relatorioAusentes6Meses(escritorioId);
    const total = rows.length;
    const reaproveitaveis = rows.filter((r) => r.reaproveitavel === true).length;
    const reaproveitados = rows.filter((r) => r.reaproveitadoEm != null).length;
    const pct =
      total > 0 ? Math.round((reaproveitados / total) * 1000) / 10 : 0;
    return { total, reaproveitaveis, reaproveitados, pctReaproveitados: pct };
  }

  async atualizarAusente(
    escritorioId: string,
    id: string,
    patch: {
      reaproveitavel?: boolean;
      reaproveitadoEm?: string | null;
      observacoesRevisao?: string | null;
    },
  ) {
    const [row] = await this.drizzle.db
      .select()
      .from(audienciaAusente)
      .where(
        and(
          eq(audienciaAusente.escritorioId, escritorioId),
          eq(audienciaAusente.id, id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Registro de ausente não encontrado');
    }
    const values: Partial<typeof audienciaAusente.$inferInsert> = {};
    if (patch.reaproveitavel !== undefined) {
      values.reaproveitavel = patch.reaproveitavel;
    }
    if (patch.reaproveitadoEm !== undefined) {
      values.reaproveitadoEm = patch.reaproveitadoEm;
    }
    if (patch.observacoesRevisao !== undefined) {
      values.observacoesRevisao = patch.observacoesRevisao?.trim() || null;
    }
    const [updated] = await this.drizzle.db
      .update(audienciaAusente)
      .set(values)
      .where(eq(audienciaAusente.id, id))
      .returning();
    return updated;
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
      await this.faseDerivacao.aplicarAposMutacao(escritorioId, dto.processoId);
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
    const out = await this.obter(escritorioId, id);
    await this.faseDerivacao.aplicarAposMutacao(escritorioId, out.processoId);
    return out;
  }

  private async aplicarCenarioPosRealizada(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    escritorioId: string,
    processoId: string,
    cenario: CenarioAudiencia,
    cenarioObservacao: string | null | undefined,
  ) {
    const hoje = hojeIso();
    if (cenario === 'REVELIA') {
      await tx
        .update(processo)
        .set({ reveliaDecretada: true, updatedAt: new Date() })
        .where(
          and(
            eq(processo.escritorioId, escritorioId),
            eq(processo.id, processoId),
          ),
        );
      return;
    }
    if (cenario === 'SO_ADVOGADO') {
      const dataLimite = await this.prazos.calcular(escritorioId, 5, hoje);
      await tx.insert(pendencia).values({
        escritorioId,
        processoId,
        tipo: 'JUSTIFICAR_AUSENCIA_CLIENTE',
        dataAbertura: hoje,
        dataLimite,
        responsavel: 'ATENDIMENTO',
        status: 'ABERTA',
        observacao: cenarioObservacao?.trim() || null,
        origem: 'POS_AUDIENCIA',
        fila: 'ATENDIMENTO',
      });
      return;
    }
    if (cenario === 'DOCUMENTACAO_PENDENTE') {
      const dataLimite = await this.prazos.calcular(escritorioId, 5, hoje);
      await tx.insert(pendencia).values({
        escritorioId,
        processoId,
        tipo: 'SOLICITAR_DOC_CONFORME_VARA',
        dataAbertura: hoje,
        dataLimite,
        responsavel: 'ATENDIMENTO',
        status: 'ABERTA',
        observacao: cenarioObservacao?.trim() || null,
        origem: 'POS_AUDIENCIA',
        fila: 'ATENDIMENTO',
      });
    }
  }

  private async registrarAusente(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    escritorioId: string,
    current: {
      id: string;
      processoId: string;
      data: string;
    },
    motivoAusencia: string,
  ) {
    const [proc] = await tx
      .select()
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.id, current.processoId),
        ),
      )
      .limit(1);
    if (proc) {
      await tx.insert(audienciaAusente).values({
        escritorioId,
        audienciaId: current.id,
        processoId: proc.id,
        numeroProcesso: proc.numero,
        clienteNome: proc.clienteNome,
        reuId: proc.reuId,
        materia: proc.materia,
        vara: proc.vara,
        qualidadeCaso: proc.qualidadeCaso,
        dataAudiencia: current.data,
        motivoAusencia: motivoAusencia.trim(),
      });
    }
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

    if (dto.houvePendencia === true) {
      const lista = dto.pendencias ?? [];
      if (!lista.length || !lista.some((p) => p.tipo?.trim())) {
        throw new BadRequestException(
          'Informe ao menos uma pendência quando houvePendencia for verdadeiro.',
        );
      }
    }

    const apRaw = dto.autorPresenca?.trim().toUpperCase();

    if (status === 'REDESIGNADA') {
      const novaData = dto.novaData?.trim();
      if (!novaData || !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
        throw new BadRequestException(
          'novaData (YYYY-MM-DD) é obrigatória para audiência REDESIGNADA.',
        );
      }
      if (apRaw === 'AUSENTE' && !dto.motivoAusencia?.trim()) {
        throw new BadRequestException(
          'motivoAusencia é obrigatório quando autorPresenca é AUSENTE.',
        );
      }

      await this.drizzle.db.transaction(async (tx) => {
        if (dto.escritorioAdversarioId) {
          await tx
            .update(audiencia)
            .set({ escritorioAdversarioId: dto.escritorioAdversarioId })
            .where(eq(audiencia.id, id));
        }
        if (apRaw === 'AUSENTE') {
          await this.registrarAusente(
            tx,
            escritorioId,
            current,
            dto.motivoAusencia!,
          );
        }
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
        const horaNova =
          dto.novaHora?.trim() ||
          (current.hora ? String(current.hora).slice(0, 5) : null);
        await tx.insert(audiencia).values({
          escritorioId,
          processoId: current.processoId,
          escritorioAdversarioId: dto.escritorioAdversarioId ?? null,
          tipo: current.tipo,
          data: novaData,
          hora: horaNova,
          pautista: current.pautista,
          status: 'AGENDADA',
          obsPre: current.obsPre,
          link: current.link,
        });
        await tx
          .update(processo)
          .set({
            dataAudiencia: novaData,
            horaAudiencia: horaNova,
            updatedAt: new Date(),
          })
          .where(eq(processo.id, current.processoId));
      });

      await this.faseDerivacao.aplicarAposMutacao(
        escritorioId,
        current.processoId,
      );
      return { movidoPara: 'redesignada', novaData };
    }

    if (status === 'REALIZADA') {
      if (apRaw !== 'PRESENTE' && apRaw !== 'AUSENTE') {
        throw new BadRequestException(
          'Para audiência REALIZADA informe autorPresenca: PRESENTE ou AUSENTE.',
        );
      }
      if (apRaw === 'AUSENTE' && !dto.motivoAusencia?.trim()) {
        throw new BadRequestException(
          'motivoAusencia é obrigatório quando autorPresenca é AUSENTE.',
        );
      }
      const cenario = dto.cenario?.trim().toUpperCase() as
        | CenarioAudiencia
        | undefined;
      if (
        !cenario ||
        !(CENARIO_AUDIENCIA_OPCOES as readonly string[]).includes(cenario)
      ) {
        throw new BadRequestException(
          'Informe o cenário da audiência (REALIZADA).',
        );
      }
      if (cenario === 'SO_ADVOGADO' && !dto.cenarioObservacao?.trim()) {
        throw new BadRequestException(
          'Justificativa é obrigatória para cenário SÓ O ADVOGADO.',
        );
      }
      if (
        cenario === 'DOCUMENTACAO_PENDENTE' &&
        !dto.cenarioObservacao?.trim()
      ) {
        throw new BadRequestException(
          'Documento necessário é obrigatório para DOCUMENTAÇÃO PENDENTE.',
        );
      }
      const cenarioObs =
        dto.cenarioObservacao === undefined
          ? null
          : dto.cenarioObservacao?.trim() || null;

      await this.drizzle.db.transaction(async (tx) => {
        if (dto.escritorioAdversarioId) {
          await tx
            .update(audiencia)
            .set({ escritorioAdversarioId: dto.escritorioAdversarioId })
            .where(eq(audiencia.id, id));
        }
        if (apRaw === 'AUSENTE') {
          await this.registrarAusente(
            tx,
            escritorioId,
            current,
            dto.motivoAusencia!,
          );
        }
        if (dto.houvePendencia === true) {
          const hoje = hojeIso();
          for (const p of dto.pendencias ?? []) {
            const tipo = p.tipo?.trim();
            if (!tipo) continue;
            await tx.insert(pendencia).values({
              escritorioId,
              processoId: current.processoId,
              tipo,
              dataAbertura: hoje,
              dataLimite: p.dataLimite ?? null,
              responsavel: p.responsavel?.trim() || null,
              status: 'ABERTA',
              observacao: p.observacao?.trim() || null,
              origem: 'POS_AUDIENCIA',
            });
          }
        }
        await this.aplicarCenarioPosRealizada(
          tx,
          escritorioId,
          current.processoId,
          cenario,
          cenarioObs,
        );
        await tx
          .update(audiencia)
          .set({
            cenario,
            cenarioObservacao: cenarioObs,
          })
          .where(eq(audiencia.id, id));
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
      await this.faseDerivacao.aplicarAposMutacao(
        escritorioId,
        current.processoId,
      );
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
      await this.faseDerivacao.aplicarAposMutacao(
        escritorioId,
        current.processoId,
      );
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
