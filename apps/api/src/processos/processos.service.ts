import { getQueueToken } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia } from '../db/schema/audiencia';
import { extracaoPendente } from '../db/schema/extracao-pendente';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { reu } from '../db/schema/reu';
import { reuAlias } from '../db/schema/reu-alias';
import { AudienciasService } from '../audiencias/audiencias.service';
import { EscritorioService } from '../escritorio/escritorio.service';
import { StorageService } from '../storage/storage.service';
import type { SkillExtractResult } from '../skill/skill.service';
import { SkillService } from '../skill/skill.service';
import type { AplicarExtracaoDto } from './dto/aplicar-extracao.dto';
import type { CreateProcessoDto } from './dto/create-processo.dto';
import type { ListProcessosQueryDto } from './dto/list-processos.query.dto';
import type { UpdateProcessoDto } from './dto/update-processo.dto';
import { parseCsvSimple } from '../importacao/csv-parse';
import {
  emptyToNull,
  normalizeTime,
  parseBrDate,
  textoResumoExtracao,
} from './skill-processo.mapper';

const MIN_CONF_INSERT_AUTOMATICO = 0.6;
const MIN_CONF_SEM_FLAG_CONFERENCIA = 0.8;

const SENTENCAS_PROCEDENTE = new Set(['PROCEDENTE', 'PARCIAL', 'ACORDO']);

export type UploadPdfExtracaoResult =
  | {
      ok: true;
      confidence: number;
      processo: typeof processo.$inferSelect;
      alerta?: string | null;
    }
  | {
      ok: false;
      confidence: number;
      extracaoPendenteId: string;
      motivo: string;
      alerta?: string | null;
    };

function mergeSkillProcesso(
  base: Record<string, unknown> | null | undefined,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(base ?? {}), ...(overrides ?? {}) };
}

@Injectable()
export class ProcessosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly skill: SkillService,
    private readonly escritorio: EscritorioService,
    private readonly audiencias: AudienciasService,
    private readonly storage: StorageService,
    @Optional()
    @Inject(getQueueToken('pdf-extract'))
    private readonly pdfQueue: Queue | undefined,
  ) {}

  async listar(escritorioId: string, query: ListProcessosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const filters = [eq(processo.escritorioId, escritorioId)];

    if (query.numero?.trim()) {
      filters.push(ilike(processo.numero, `%${query.numero.trim()}%`));
    }
    if (query.vara?.trim()) {
      filters.push(ilike(processo.vara, `%${query.vara.trim()}%`));
    }
    if (query.materia?.trim()) {
      filters.push(ilike(processo.materia, `%${query.materia.trim()}%`));
    }
    if (query.sistema?.trim()) {
      filters.push(ilike(processo.sistema, `%${query.sistema.trim()}%`));
    }
    if (query.clienteNome?.trim()) {
      filters.push(ilike(processo.clienteNome, `%${query.clienteNome.trim()}%`));
    }
    if (query.situacao?.trim()) {
      filters.push(ilike(processo.situacao, `%${query.situacao.trim()}%`));
    }
    if (query.faseAtual?.trim()) {
      filters.push(ilike(processo.faseAtual, `%${query.faseAtual.trim()}%`));
    }

    const whereClause = and(...filters);

    const col = {
      createdAt: processo.createdAt,
      updatedAt: processo.updatedAt,
      numero: processo.numero,
      vara: processo.vara,
      materia: processo.materia,
      sistema: processo.sistema,
      clienteNome: processo.clienteNome,
    }[sort];

    const orderExpr = order === 'asc' ? asc(col) : desc(col);

    const db = this.drizzle.db;
    const [totalRow] = await db
      .select({ c: count() })
      .from(processo)
      .where(whereClause);

    const rows = await db
      .select()
      .from(processo)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      meta: {
        page,
        limit,
        total: totalRow?.c ?? 0,
        totalPages: Math.ceil((totalRow?.c ?? 0) / limit) || 1,
      },
    };
  }

  async obterPorId(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(processo)
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Processo não encontrado');
    }
    return row;
  }

  async atualizarParcial(
    escritorioId: string,
    id: string,
    dto: UpdateProcessoDto,
  ) {
    await this.obterPorId(escritorioId, id);

    if (dto.reuId !== undefined && dto.reuId !== null) {
      const [r] = await this.drizzle.db
        .select({ id: reu.id })
        .from(reu)
        .where(
          and(eq(reu.id, dto.reuId), eq(reu.escritorioId, escritorioId)),
        )
        .limit(1);

      if (!r) {
        throw new BadRequestException(
          'Réu não encontrado ou não pertence a este escritório.',
        );
      }
    }

    const nullableTrim = (v: string | null): string | null => {
      if (v === null) {
        return null;
      }
      const t = v.trim();
      return t === '' ? null : t;
    };

    const patch: Partial<typeof processo.$inferInsert> = {};

    if (dto.login !== undefined) {
      patch.login =
        dto.login === null ? null : nullableTrim(dto.login);
    }
    if (dto.clienteNome !== undefined) {
      patch.clienteNome =
        dto.clienteNome === null ? null : nullableTrim(dto.clienteNome);
    }
    if (dto.clienteCpf !== undefined) {
      patch.clienteCpf =
        dto.clienteCpf === null ? null : nullableTrim(dto.clienteCpf);
    }
    if (dto.reuId !== undefined) {
      patch.reuId = dto.reuId;
    }
    if (dto.reuTexto !== undefined) {
      patch.reuTexto =
        dto.reuTexto === null ? null : nullableTrim(dto.reuTexto);
    }
    if (dto.materia !== undefined) {
      patch.materia =
        dto.materia === null ? null : nullableTrim(dto.materia);
    }
    if (dto.sistema !== undefined) {
      const s = (dto.sistema ?? '').trim();
      patch.sistema =
        s.length > 20 ? s.slice(0, 20) : s.length ? s : 'DESCONHECIDO';
    }
    if (dto.vara !== undefined) {
      patch.vara = dto.vara === null ? null : nullableTrim(dto.vara);
    }
    if (dto.dataDistribuicao !== undefined) {
      patch.dataDistribuicao = dto.dataDistribuicao;
    }
    if (dto.dataAudiencia !== undefined) {
      patch.dataAudiencia = dto.dataAudiencia;
    }
    if (dto.horaAudiencia !== undefined) {
      patch.horaAudiencia = dto.horaAudiencia;
    }
    if (dto.tipoAudiencia !== undefined) {
      patch.tipoAudiencia =
        dto.tipoAudiencia === null ? null : nullableTrim(dto.tipoAudiencia);
    }
    if (dto.situacao !== undefined) {
      patch.situacao =
        dto.situacao === null ? null : nullableTrim(dto.situacao);
    }
    if (dto.faseAtual !== undefined) {
      patch.faseAtual =
        dto.faseAtual === null ? null : nullableTrim(dto.faseAtual);
    }
    if (dto.dataSentenca !== undefined) {
      patch.dataSentenca = dto.dataSentenca;
    }
    if (dto.sentenca !== undefined) {
      patch.sentenca =
        dto.sentenca === null ? null : nullableTrim(dto.sentenca);
    }
    if (dto.valorSentenca !== undefined) {
      patch.valorSentenca = dto.valorSentenca;
    }
    if (dto.recurso !== undefined) {
      patch.recurso =
        dto.recurso === null ? null : nullableTrim(dto.recurso);
    }
    if (dto.turma !== undefined) {
      patch.turma = dto.turma === null ? null : nullableTrim(dto.turma);
    }
    if (dto.acordao !== undefined) {
      patch.acordao =
        dto.acordao === null ? null : nullableTrim(dto.acordao);
    }
    if (dto.situacaoFinal !== undefined) {
      patch.situacaoFinal =
        dto.situacaoFinal === null ? null : nullableTrim(dto.situacaoFinal);
    }
    if (dto.telefone !== undefined) {
      patch.telefone =
        dto.telefone === null ? null : nullableTrim(dto.telefone);
    }
    if (dto.statusAudiencia !== undefined) {
      patch.statusAudiencia =
        dto.statusAudiencia === null ? null : nullableTrim(dto.statusAudiencia);
    }
    if (dto.ultimaMovimentacaoDt !== undefined) {
      patch.ultimaMovimentacaoDt =
        dto.ultimaMovimentacaoDt === null
          ? null
          : new Date(dto.ultimaMovimentacaoDt);
    }
    if (dto.ultimaMovimentacaoTipo !== undefined) {
      patch.ultimaMovimentacaoTipo =
        dto.ultimaMovimentacaoTipo === null
          ? null
          : nullableTrim(dto.ultimaMovimentacaoTipo);
    }
    if (dto.requerConferencia !== undefined) {
      patch.requerConferencia = dto.requerConferencia;
    }

    if (!Object.keys(patch).length) {
      throw new BadRequestException('Informe ao menos um campo para atualizar.');
    }

    patch.updatedAt = new Date();

    await this.drizzle.db
      .update(processo)
      .set(patch)
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, id)),
      );

    const atualizado = await this.obterPorId(escritorioId, id);
    await this.syncProcedenteSeNecessario(escritorioId, atualizado);

    if (
      dto.dataAudiencia !== undefined ||
      dto.horaAudiencia !== undefined ||
      dto.tipoAudiencia !== undefined
    ) {
      await this.audiencias.sincronizarDaExtracaoPdf(escritorioId, id, {
        dataAudiencia: atualizado.dataAudiencia,
        horaAudiencia: atualizado.horaAudiencia,
        tipoAudiencia: atualizado.tipoAudiencia,
      });
    }

    return atualizado;
  }

  async upsertFromSkill(
    escritorioId: string,
    skillProc: Record<string, unknown>,
    options: { requerConferencia: boolean },
  ) {
    const db = this.drizzle.db;
    const numero = String(skillProc.numero ?? '').trim();
    if (!numero) {
      throw new BadRequestException('Processo sem número — não é possível gravar.');
    }

    const reuId = await this.resolveReuId(
      escritorioId,
      skillProc.reu_texto as string | undefined,
    );

    const sistemaRaw = emptyToNull(skillProc.sistema) ?? 'DESCONHECIDO';
    const sistema =
      sistemaRaw.length > 20 ? sistemaRaw.slice(0, 20) : sistemaRaw;

    const insertValues = {
      escritorioId,
      numero,
      login: emptyToNull(skillProc.login),
      clienteNome: emptyToNull(skillProc.cliente_nome),
      clienteCpf: emptyToNull(skillProc.cliente_cpf),
      reuId,
      reuTexto: emptyToNull(skillProc.reu_texto),
      materia: emptyToNull(skillProc.materia),
      sistema,
      vara: emptyToNull(skillProc.vara),
      dataDistribuicao: parseBrDate(skillProc.data_distribuicao),
      dataAudiencia: parseBrDate(skillProc.data_audiencia),
      horaAudiencia: normalizeTime(skillProc.hora_audiencia),
      tipoAudiencia: emptyToNull(skillProc.tipo_audiencia),
      situacao: emptyToNull(skillProc.situacao_inicial),
      faseAtual: emptyToNull(skillProc.fase_inicial),
      requerConferencia: options.requerConferencia,
      updatedAt: new Date(),
    };

    const updateSet = {
      login: insertValues.login,
      clienteNome: insertValues.clienteNome,
      clienteCpf: insertValues.clienteCpf,
      reuId: insertValues.reuId,
      reuTexto: insertValues.reuTexto,
      materia: insertValues.materia,
      sistema: insertValues.sistema,
      vara: insertValues.vara,
      dataDistribuicao: insertValues.dataDistribuicao,
      dataAudiencia: insertValues.dataAudiencia,
      horaAudiencia: insertValues.horaAudiencia,
      tipoAudiencia: insertValues.tipoAudiencia,
      situacao: insertValues.situacao,
      faseAtual: insertValues.faseAtual,
      requerConferencia: insertValues.requerConferencia,
      updatedAt: new Date(),
    };

    await db
      .insert(processo)
      .values({
        ...insertValues,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [processo.escritorioId, processo.numero],
        set: updateSet,
      });

    const [out] = await db
      .select()
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          eq(processo.numero, numero),
        ),
      )
      .limit(1);

    if (!out) {
      throw new BadRequestException('Falha ao recuperar processo após upsert');
    }

    await this.audiencias.sincronizarDaExtracaoPdf(escritorioId, out.id, {
      dataAudiencia: out.dataAudiencia,
      horaAudiencia: out.horaAudiencia,
      tipoAudiencia: out.tipoAudiencia,
    });

    return out;
  }

  private async resolveReuId(
    escritorioId: string,
    reuTexto: string | undefined,
  ): Promise<string | null> {
    const nome = reuTexto?.trim();
    if (!nome) {
      return null;
    }

    const db = this.drizzle.db;
    const upper = nome.toUpperCase();

    const [porAlias] = await db
      .select({ id: reu.id })
      .from(reuAlias)
      .innerJoin(reu, eq(reu.id, reuAlias.reuId))
      .where(
        and(eq(reu.escritorioId, escritorioId), eq(reuAlias.alias, upper)),
      )
      .limit(1);
    if (porAlias) {
      return porAlias.id;
    }

    const [existing] = await db
      .select({ id: reu.id })
      .from(reu)
      .where(
        and(eq(reu.escritorioId, escritorioId), eq(reu.nomeCanonico, upper)),
      )
      .limit(1);

    if (existing) {
      return existing.id;
    }

    const [ins] = await db
      .insert(reu)
      .values({ escritorioId, nomeCanonico: upper })
      .returning({ id: reu.id });

    return ins?.id ?? null;
  }

  private async syncProcedenteSeNecessario(
    escritorioId: string,
    row: typeof processo.$inferSelect,
  ) {
    const db = this.drizzle.db;
    const s = row.sentenca?.trim() ?? '';
    if (!SENTENCAS_PROCEDENTE.has(s)) {
      await db
        .delete(processoProcedente)
        .where(eq(processoProcedente.processoId, row.id));
      return;
    }

    const now = new Date();
    await db
      .insert(processoProcedente)
      .values({
        processoId: row.id,
        escritorioId,
        familiaSituacao: 'AGUARDAR_TRANSITO',
        situacao: 'AGUARDANDO_TRANSITO',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: processoProcedente.processoId,
        set: { updatedAt: now },
      });
  }

  async criarManual(escritorioId: string, dto: CreateProcessoDto) {
    const cfg = await this.escritorio.getSkillConfigJson(escritorioId);

    if (dto.reuId) {
      const [r] = await this.drizzle.db
        .select({ id: reu.id })
        .from(reu)
        .where(and(eq(reu.id, dto.reuId), eq(reu.escritorioId, escritorioId)))
        .limit(1);
      if (!r) {
        throw new BadRequestException(
          'Réu não encontrado ou não pertence a este escritório.',
        );
      }
    }

    const reuId =
      dto.reuId ??
      (await this.resolveReuId(escritorioId, dto.reuTexto ?? undefined));

    const skillLike: Record<string, unknown> = {
      numero: dto.numero.trim(),
      sistema: dto.sistema.trim(),
      login: dto.login ?? null,
      cliente_nome: dto.clienteNome ?? null,
      cliente_cpf: dto.clienteCpf ?? null,
      reu_texto: dto.reuTexto ?? null,
      materia: dto.materia ?? null,
      vara: dto.vara ?? null,
      data_distribuicao: dto.dataDistribuicao ?? null,
      data_audiencia: dto.dataAudiencia ?? null,
      hora_audiencia: dto.horaAudiencia ?? null,
      tipo_audiencia: dto.tipoAudiencia ?? null,
      situacao_inicial: dto.situacao ?? (cfg.situacao_inicial as string),
      fase_inicial: dto.faseAtual ?? (cfg.fase_inicial as string),
    };

    if (reuId) {
      const [rNome] = await this.drizzle.db
        .select({ nomeCanonico: reu.nomeCanonico })
        .from(reu)
        .where(and(eq(reu.id, reuId), eq(reu.escritorioId, escritorioId)))
        .limit(1);
      if (rNome) {
        skillLike.reu_texto = rNome.nomeCanonico;
      }
    }

    const proc = await this.upsertFromSkill(escritorioId, skillLike, {
      requerConferencia: dto.requerConferencia ?? false,
    });
    await this.syncProcedenteSeNecessario(escritorioId, proc);
    return proc;
  }

  async remover(escritorioId: string, id: string) {
    await this.obterPorId(escritorioId, id);
    const db = this.drizzle.db;

    const [[pRow], [aRow]] = await Promise.all([
      db
        .select({ n: count() })
        .from(pendencia)
        .where(eq(pendencia.processoId, id)),
      db
        .select({ n: count() })
        .from(audiencia)
        .where(eq(audiencia.processoId, id)),
    ]);

    if ((pRow?.n ?? 0) > 0 || (aRow?.n ?? 0) > 0) {
      throw new ConflictException(
        'Não é possível excluir: existem pendências ou audiências vinculadas a este processo.',
      );
    }

    await db.delete(processo).where(eq(processo.id, id));
    return { ok: true };
  }

  async importarCsv(escritorioId: string, csv: string) {
    const linhas = parseCsvSimple(csv);
    const erros: { linha: number; mensagem: string }[] = [];
    let importados = 0;

    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];
      const numero = (row.numero ?? '').trim();
      const sistema = (row.sistema ?? '').trim();
      if (!numero || !sistema) {
        erros.push({
          linha: i + 2,
          mensagem: 'Campos numero e sistema são obrigatórios.',
        });
        continue;
      }
      try {
        const skillLike: Record<string, unknown> = {
          numero,
          sistema,
          login: row.login || null,
          cliente_nome: row.cliente_nome || null,
          cliente_cpf: row.cliente_cpf || null,
          reu_texto: row.reu_texto || null,
          materia: row.materia || null,
          vara: row.vara || null,
          data_distribuicao: row.data_distribuicao || null,
          data_audiencia: row.data_audiencia || null,
          hora_audiencia: row.hora_audiencia || null,
          tipo_audiencia: row.tipo_audiencia || null,
        };
        const proc = await this.upsertFromSkill(escritorioId, skillLike, {
          requerConferencia: false,
        });
        await this.syncProcedenteSeNecessario(escritorioId, proc);
        importados += 1;
      } catch (e) {
        erros.push({
          linha: i + 2,
          mensagem: (e as Error).message,
        });
      }
    }

    return { importados, erros, totalLinhas: linhas.length };
  }

  /**
   * Se `REDIS_URL` + fila `pdf-extract` + Supabase Storage estiverem ativos,
   * enfileira extração; senão executa síncrono (`extrairPdfUpload`).
   */
  async extrairPdfDecisao(
    escritorioId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<
    UploadPdfExtracaoResult | { assincrono: true; jobId: string }
  > {
    if (this.pdfQueue && this.storage.isEnabled()) {
      const storagePath = await this.storage.uploadPdfTemp(
        escritorioId,
        buffer,
        filename,
      );
      const job = await this.pdfQueue.add('extract', {
        escritorioId,
        filename,
        storagePath,
      });
      return { assincrono: true, jobId: String(job.id) };
    }
    return this.extrairPdfUpload(escritorioId, buffer, filename);
  }

  /** Estado do job BullMQ `pdf-extract` (mesmo tenant do JWT). */
  async obterStatusJobPdf(escritorioId: string, jobId: string) {
    if (!this.pdfQueue) {
      throw new ServiceUnavailableException(
        'Fila de extração PDF indisponível (configure REDIS_URL).',
      );
    }
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }
    const data = job.data as { escritorioId?: string };
    if (data.escritorioId !== escritorioId) {
      throw new ForbiddenException();
    }
    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      progress: job.progress,
      returnvalue: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      finishedOn: job.finishedOn ?? null,
      processedOn: job.processedOn ?? null,
    };
  }

  async extrairPdfUpload(
    escritorioId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<UploadPdfExtracaoResult> {
    const config = await this.escritorio.getSkillConfigJson(escritorioId);
    const resultado = await this.skill.extract(buffer, filename, config);
    return this.tratarResultadoSkill(escritorioId, resultado, filename);
  }

  private async tratarResultadoSkill(
    escritorioId: string,
    resultado: SkillExtractResult,
    filename: string,
  ): Promise<UploadPdfExtracaoResult> {
    const db = this.drizzle.db;
    const textoExtraido = textoResumoExtracao(resultado);
    const conf = Number(resultado.confidence) || 0;
    const proc = resultado.processo;
    const numero = proc ? String(proc.numero ?? '').trim() : '';

    const precisaFila =
      conf === 0 ||
      !numero ||
      conf < MIN_CONF_INSERT_AUTOMATICO ||
      resultado.alerta === 'erro_leitura';

    if (precisaFila) {
      const motivo =
        resultado.erro ??
        (conf === 0 ? 'Extração sem confiança' : 'Confiança abaixo do mínimo')
          .toString();

      const [row] = await db
        .insert(extracaoPendente)
        .values({
          escritorioId,
          arquivoNome: filename.slice(0, 255),
          arquivoStorageKey: null,
          textoExtraido,
          resultadoSkill: resultado as object,
          confidence: conf.toFixed(2),
          alerta: resultado.alerta
            ? String(resultado.alerta).slice(0, 50)
            : null,
          revisaoStatus: 'PENDENTE',
        })
        .returning({ id: extracaoPendente.id });

      if (!row) {
        throw new BadRequestException('Falha ao registrar extração pendente');
      }

      return {
        ok: false,
        confidence: conf,
        extracaoPendenteId: row.id,
        motivo,
        alerta: resultado.alerta,
      };
    }

    const procRow = await this.upsertFromSkill(escritorioId, proc!, {
      requerConferencia: conf < MIN_CONF_SEM_FLAG_CONFERENCIA,
    });
    await this.syncProcedenteSeNecessario(escritorioId, procRow);

    return {
      ok: true,
      confidence: conf,
      processo: procRow,
      alerta: resultado.alerta,
    };
  }

  async listarExtracoesPendentes(escritorioId: string, limit = 100) {
    return this.drizzle.db
      .select()
      .from(extracaoPendente)
      .where(eq(extracaoPendente.escritorioId, escritorioId))
      .orderBy(desc(extracaoPendente.createdAt))
      .limit(limit);
  }

  async obterExtracaoPendente(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(extracaoPendente)
      .where(
        and(
          eq(extracaoPendente.escritorioId, escritorioId),
          eq(extracaoPendente.id, id),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Extração pendente não encontrada');
    }
    return row;
  }

  async aplicarExtracaoPendente(
    escritorioId: string,
    extracaoId: string,
    usuarioId: string,
    dto: AplicarExtracaoDto,
  ) {
    const row = await this.obterExtracaoPendente(escritorioId, extracaoId);

    if (row.revisaoStatus === 'CONCLUIDA') {
      throw new ConflictException('Esta extração já foi aplicada.');
    }

    const resultado = row.resultadoSkill as SkillExtractResult;
    const merged = mergeSkillProcesso(resultado.processo, dto.campos);

    const procRow = await this.upsertFromSkill(escritorioId, merged, {
      requerConferencia: false,
    });
    await this.syncProcedenteSeNecessario(escritorioId, procRow);

    await this.drizzle.db
      .update(extracaoPendente)
      .set({
        revisaoStatus: 'CONCLUIDA',
        processoId: procRow.id,
        revisadoPor: usuarioId,
        revisadoEm: new Date(),
      })
      .where(eq(extracaoPendente.id, extracaoId));

    return procRow;
  }
}
