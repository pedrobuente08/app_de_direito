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
  UnauthorizedException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  sql,
} from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { audiencia } from '../db/schema/audiencia';
import { extracaoPendente } from '../db/schema/extracao-pendente';
import { faseHistorico } from '../db/schema/fase-historico';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { sentenca } from '../db/schema/sentenca';
import { processoProcedente } from '../db/schema/processo-procedente';
import { reu } from '../db/schema/reu';
import { reuAlias } from '../db/schema/reu-alias';
import { AudienciasService } from '../audiencias/audiencias.service';
import { EscritorioService } from '../escritorio/escritorio.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { transicaoFasePermitida } from '../fase-derivacao/fase-transicoes';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { StorageService } from '../storage/storage.service';
import type { SkillExtractResult } from '../skill/skill.service';
import { SkillService } from '../skill/skill.service';
import type { AplicarExtracaoDto } from './dto/aplicar-extracao.dto';
import type { ConfirmarBatchItemDto } from './dto/confirmar-batch.dto';
import type { CreateProcessoDto } from './dto/create-processo.dto';
import type { ListProcessosQueryDto } from './dto/list-processos.query.dto';
import type { UpdateProcessoDto } from './dto/update-processo.dto';
import { parseCsvSimple } from '../importacao/csv-parse';
import {
  classificarResultadoSkill,
  type PdfPreviewItem,
  type PdfSemaforoCor,
} from './pdf-batch-classifier';
import {
  emptyToNull,
  normalizeTime,
  parseBrDate,
  textoResumoExtracao,
} from './skill-processo.mapper';

const MIN_CONF_INSERT_AUTOMATICO = 0.6;
const MIN_CONF_SEM_FLAG_CONFERENCIA = 0.8;

const SENTENCAS_PROCEDENTE = new Set(['PROCEDENTE', 'PARCIAL', 'ACORDO']);

function normalizeStatusProcesso(raw: unknown): string {
  const t = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (t === 'SOBRESTADO' || t === 'ARQUIVADO' || t === 'ATIVO') {
    return t;
  }
  return 'ATIVO';
}

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
    private readonly faseDerivacao: FaseDerivacaoService,
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
    const statusFiltro =
      query.statusProcesso?.trim() || query.situacao?.trim();
    if (statusFiltro) {
      filters.push(eq(processo.statusProcesso, normalizeStatusProcesso(statusFiltro)));
    }
    if (query.faseAtual?.trim()) {
      filters.push(ilike(processo.faseAtual, `%${query.faseAtual.trim()}%`));
    }
    if (query.qualidadeCaso?.trim()) {
      filters.push(
        ilike(processo.qualidadeCaso, `%${query.qualidadeCaso.trim()}%`),
      );
    }
    if (query.filterUltimaSentenca === 'BOA') {
      filters.push(
        sql`(select s.favoravel_para from sentenca s where s.processo_id = ${processo.id} order by s.data desc nulls last, s.created_at desc nulls last limit 1) = 'AUTOR'`,
      );
    } else if (query.filterUltimaSentenca === 'RUIM') {
      filters.push(
        sql`(select s.favoravel_para from sentenca s where s.processo_id = ${processo.id} order by s.data desc nulls last, s.created_at desc nulls last limit 1) = 'REU'`,
      );
    } else if (query.filterUltimaSentenca === 'SEM') {
      filters.push(
        sql`not exists (select 1 from sentenca s where s.processo_id = ${processo.id})`,
      );
    }
    if (query.emAvaliacao === true) {
      filters.push(
        sql`coalesce((${processo.avaliacaoRecurso}->>'ativa')::boolean, false) = true`,
      );
    }
    if (query.acaoImediata === true) {
      filters.push(
        sql`exists (
          select 1 from pendencia pend
          where pend.processo_id = ${processo.id}
            and pend.escritorio_id = ${escritorioId}
            and pend.status = 'ABERTA'
            and (
              pend.data_limite is null
              or pend.data_limite <= (current_date + interval '2 days')::date
            )
        )`,
      );
    }
    if (query.arquivados30d === true) {
      filters.push(eq(processo.statusProcesso, 'ARQUIVADO'));
      filters.push(
        sql`${processo.updatedAt} >= (current_timestamp - interval '30 days')`,
      );
    } else if (!statusFiltro) {
      filters.push(sql`${processo.statusProcesso} <> 'ARQUIVADO'`);
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
      .select({
        ...getTableColumns(processo),
        ultimaSentencaResultado: sql<string | null>`
          (select s.resultado from sentenca s
           where s.processo_id = ${processo.id}
           order by s.data desc nulls last, s.created_at desc nulls last
           limit 1)
        `.as('ultimaSentencaResultado'),
      })
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

  /** Cards §5.1 — aba Intimações. */
  async resumoIntimacoes(escritorioId: string) {
    const db = this.drizzle.db;
    const base = eq(processo.escritorioId, escritorioId);

    const [ativosRow] = await db
      .select({ c: count() })
      .from(processo)
      .where(and(base, sql`${processo.statusProcesso} <> 'ARQUIVADO'`));

    const [acaoRow] = await db
      .select({ c: count() })
      .from(processo)
      .where(
        and(
          base,
          sql`${processo.statusProcesso} <> 'ARQUIVADO'`,
          sql`exists (
            select 1 from pendencia pend
            where pend.processo_id = ${processo.id}
              and pend.escritorio_id = ${escritorioId}
              and pend.status = 'ABERTA'
              and (
                pend.data_limite is null
                or pend.data_limite <= (current_date + interval '2 days')::date
              )
          )`,
        ),
      );

    const [avaliarRow] = await db
      .select({ c: count() })
      .from(processo)
      .where(
        and(
          base,
          sql`coalesce((${processo.avaliacaoRecurso}->>'ativa')::boolean, false) = true`,
        ),
      );

    const [arqRow] = await db
      .select({ c: count() })
      .from(processo)
      .where(
        and(
          base,
          eq(processo.statusProcesso, 'ARQUIVADO'),
          sql`${processo.updatedAt} >= (current_timestamp - interval '30 days')`,
        ),
      );

    return {
      totalAtivos: ativosRow?.c ?? 0,
      acaoImediata: acaoRow?.c ?? 0,
      emAvaliacao: avaliarRow?.c ?? 0,
      arquivados30d: arqRow?.c ?? 0,
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

  async obterTimeline(escritorioId: string, id: string) {
    const proc = await this.obterPorId(escritorioId, id);
    const eventos: {
      id: string;
      tipo: 'distribuicao' | 'audiencia' | 'sentenca' | 'fase';
      data: string;
      titulo: string;
      subtitulo: string | null;
    }[] = [];

    if (proc.dataDistribuicao) {
      eventos.push({
        id: `dist-${proc.id}`,
        tipo: 'distribuicao',
        data: String(proc.dataDistribuicao),
        titulo: 'Distribuído',
        subtitulo: proc.vara ? `Vara: ${proc.vara}` : null,
      });
    }

    const auds = await this.drizzle.db
      .select()
      .from(audiencia)
      .where(
        and(
          eq(audiencia.processoId, id),
          eq(audiencia.escritorioId, escritorioId),
        ),
      )
      .orderBy(asc(audiencia.data));

    for (const a of auds) {
      const st = (a.status ?? '').toUpperCase();
      let titulo = 'Audiência agendada';
      if (st === 'REALIZADA') titulo = 'Audiência realizada';
      else if (st === 'CANCELADA') titulo = 'Audiência cancelada';
      else if (st === 'ADIADA') titulo = 'Audiência adiada';
      else if (st === 'REDESIGNADA') titulo = 'Audiência redesignada';
      const hora = a.hora ? String(a.hora).slice(0, 5) : null;
      const partes = [a.tipo, hora, a.autorPresenca].filter(Boolean);
      eventos.push({
        id: `aud-${a.id}`,
        tipo: 'audiencia',
        data: String(a.data),
        titulo,
        subtitulo: partes.length ? partes.join(' · ') : null,
      });
    }

    const grauLabel: Record<string, string> = {
      PRIMEIRO_GRAU: '1º grau',
      SEGUNDO_GRAU: '2º grau',
      EMBARGOS: 'Embargos',
    };

    const sents = await this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, id),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .orderBy(asc(sentenca.data));

    for (const s of sents) {
      const grau = grauLabel[s.grau] ?? s.grau;
      const valorNum =
        s.valor != null && String(s.valor).trim() !== ''
          ? Number(s.valor)
          : null;
      const valorFmt =
        valorNum != null && !Number.isNaN(valorNum)
          ? `R$ ${valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : null;
      const fav =
        s.favoravelPara === 'AUTOR'
          ? 'Favorável ao autor'
          : s.favoravelPara === 'REU'
            ? 'Favorável ao réu'
            : s.favoravelPara;
      eventos.push({
        id: `sent-${s.id}`,
        tipo: 'sentenca',
        data: String(s.data),
        titulo: `Sentença (${grau}): ${s.resultado}`,
        subtitulo: [valorFmt, fav].filter(Boolean).join(' — ') || null,
      });
    }

    const fases = await this.drizzle.db
      .select()
      .from(faseHistorico)
      .where(
        and(
          eq(faseHistorico.processoId, id),
          eq(faseHistorico.escritorioId, escritorioId),
        ),
      )
      .orderBy(asc(faseHistorico.createdAt));

    for (const f of fases) {
      eventos.push({
        id: `fase-${f.id}`,
        tipo: 'fase',
        data: f.createdAt.toISOString(),
        titulo: `Fase: ${f.faseNova}`,
        subtitulo: f.faseAnterior
          ? `${f.faseAnterior} → ${f.faseNova} (${f.origem})`
          : `Origem: ${f.origem}`,
      });
    }

    eventos.sort((a, b) => {
      const da = new Date(a.data).getTime();
      const db = new Date(b.data).getTime();
      if (Number.isNaN(da) && Number.isNaN(db)) return 0;
      if (Number.isNaN(da)) return 1;
      if (Number.isNaN(db)) return -1;
      return da - db;
    });

    return { processoId: id, eventos };
  }

  async atualizarParcial(
    escritorioId: string,
    id: string,
    dto: UpdateProcessoDto,
    usuarioId?: string | null,
  ) {
    const antes = await this.obterPorId(escritorioId, id);
    const faseAntes = antes.faseAtual?.trim() ?? null;

    if (dto.faseAtual !== undefined) {
      const n = await this.faseDerivacao.contarPendenciasAbertas(
        escritorioId,
        id,
      );
      if (n > 0) {
        throw new BadRequestException(
          'Não é possível alterar a fase manualmente enquanto houver pendências abertas.',
        );
      }
      const novaFase =
        dto.faseAtual === null ? null : dto.faseAtual.trim();
      if (novaFase) {
        const tenant = await this.escritorio.obterPerfilTenant(escritorioId);
        const cfg = (tenant.config ?? {}) as EscritorioConfig;
        if (
          !transicaoFasePermitida(
            faseAntes,
            novaFase,
            cfg.transicoes_fase ?? null,
          )
        ) {
          throw new BadRequestException(
            `Transição de fase não permitida: "${faseAntes ?? '(sem fase)'}" → "${novaFase}". Ajuste em Configurações ou escolha outra fase.`,
          );
        }
      }
    }

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
    if (dto.statusProcesso !== undefined) {
      patch.statusProcesso = normalizeStatusProcesso(dto.statusProcesso);
    } else if (dto.situacao !== undefined) {
      patch.statusProcesso = normalizeStatusProcesso(dto.situacao);
    }
    if (dto.faseAtual !== undefined) {
      patch.faseAtual =
        dto.faseAtual === null ? null : nullableTrim(dto.faseAtual);
    }
    if (dto.qualidadeCaso !== undefined) {
      patch.qualidadeCaso =
        dto.qualidadeCaso === null ? null : nullableTrim(dto.qualidadeCaso);
    }
    if (dto.avaliacaoRecurso !== undefined) {
      patch.avaliacaoRecurso = dto.avaliacaoRecurso;
    }
    if (dto.justicaGratuita !== undefined) {
      patch.justicaGratuita = dto.justicaGratuita;
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
    if (dto.observacoes !== undefined) {
      patch.observacoes =
        dto.observacoes === null ? null : nullableTrim(dto.observacoes);
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

    if (
      dto.faseAtual !== undefined &&
      usuarioId &&
      (patch.faseAtual ?? null) !== (faseAntes ?? null)
    ) {
      await this.drizzle.db.insert(faseHistorico).values({
        processoId: id,
        escritorioId,
        faseAnterior: faseAntes,
        faseNova: patch.faseAtual ?? '(sem fase)',
        origem: 'MANUAL',
        usuarioId,
      });
    }

    const atualizado = await this.obterPorId(escritorioId, id);
    await this.syncProcedenteSeNecessario(escritorioId, atualizado, {
      skipFaseDerivacao: dto.faseAtual !== undefined,
    });

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
      statusProcesso: normalizeStatusProcesso(
        emptyToNull(skillProc.status_processo_inicial) ??
          emptyToNull(skillProc.situacao_inicial),
      ),
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
      statusProcesso: insertValues.statusProcesso,
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

  private async ultimaSentencaResultado(
    processoId: string,
  ): Promise<string | null> {
    const [r] = await this.drizzle.db
      .select({ resultado: sentenca.resultado })
      .from(sentenca)
      .where(eq(sentenca.processoId, processoId))
      .orderBy(desc(sentenca.data), desc(sentenca.createdAt))
      .limit(1);
    return r?.resultado?.trim() ?? null;
  }

  private async syncProcedenteSeNecessario(
    escritorioId: string,
    row: typeof processo.$inferSelect,
    opts?: { skipFaseDerivacao?: boolean },
  ) {
    const db = this.drizzle.db;
    const s = (await this.ultimaSentencaResultado(row.id)) ?? '';
    if (!SENTENCAS_PROCEDENTE.has(s)) {
      await db
        .delete(processoProcedente)
        .where(eq(processoProcedente.processoId, row.id));
      if (!opts?.skipFaseDerivacao) {
        await this.faseDerivacao.aplicarAposMutacao(escritorioId, row.id);
      }
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
    if (!opts?.skipFaseDerivacao) {
      await this.faseDerivacao.aplicarAposMutacao(escritorioId, row.id);
    }
  }

  /** Após insert/update em `sentenca`, reavalia vínculo com `processo_procedente`. */
  async recalcularProcedenteAposSentenca(
    escritorioId: string,
    processoId: string,
  ) {
    const row = await this.obterPorId(escritorioId, processoId);
    await this.syncProcedenteSeNecessario(escritorioId, row);
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
      status_processo_inicial:
        dto.statusProcesso ??
        dto.situacao ??
        (cfg.status_processo_inicial ?? cfg.situacao_inicial),
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

  private async obterProcessoIdPorDigitos(
    escritorioId: string,
    numero: string,
  ): Promise<string | null> {
    const digits = numero.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    const [row] = await this.drizzle.db
      .select({ id: processo.id })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`regexp_replace(${processo.numero}, '[^0-9]', '', 'g') = ${digits}`,
        ),
      )
      .limit(1);
    return row?.id ?? null;
  }

  async previewPdfBatch(
    escritorioId: string,
    files: Express.Multer.File[],
  ): Promise<PdfPreviewItem[]> {
    const config = await this.escritorio.getSkillConfigJson(escritorioId);
    const out: PdfPreviewItem[] = [];
    for (let i = 0; i < files.length; i += 5) {
      const chunk = files.slice(i, i + 5);
      const part = await Promise.all(
        chunk.map((f) => this.previewUmPdf(escritorioId, f, config)),
      );
      out.push(...part);
    }
    return out;
  }

  async confirmarBatch(
    escritorioId: string,
    items: ConfirmarBatchItemDto[],
  ): Promise<{
    inseridos: number;
    jaExistiam: number;
    erros: { itemId: string; mensagem: string }[];
  }> {
    const cfg = await this.escritorio.getSkillConfigJson(escritorioId);
    let inseridos = 0;
    let jaExistiam = 0;
    const erros: { itemId: string; mensagem: string }[] = [];

    for (const item of items) {
      const num = item.numero.trim();
      if (!num) {
        erros.push({ itemId: item.itemId, mensagem: 'Número vazio.' });
        continue;
      }
      const dupId = await this.obterProcessoIdPorDigitos(escritorioId, num);
      if (dupId) {
        jaExistiam += 1;
        continue;
      }
      try {
        const skillLike = this.confirmarItemParaSkill(item, cfg);
        const procRow = await this.upsertFromSkill(escritorioId, skillLike, {
          requerConferencia: false,
        });
        await this.syncProcedenteSeNecessario(escritorioId, procRow);
        inseridos += 1;
      } catch (e) {
        erros.push({
          itemId: item.itemId,
          mensagem: (e as Error).message,
        });
      }
    }

    return { inseridos, jaExistiam, erros };
  }

  private confirmarItemParaSkill(
    item: ConfirmarBatchItemDto,
    cfg: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      numero: item.numero.trim(),
      cliente_nome: item.clienteNome ?? null,
      cliente_cpf: item.clienteCpf ?? null,
      reu_texto: item.reuTexto ?? null,
      vara: item.vara ?? null,
      materia: item.materia ?? null,
      sistema: item.sistema.trim(),
      login: item.login ?? null,
      data_distribuicao: item.dataDistribuicao?.trim() || null,
      data_audiencia: item.dataAudiencia?.trim() || null,
      hora_audiencia: item.horaAudiencia?.trim() || null,
      status_processo_inicial:
        cfg.status_processo_inicial ?? cfg.situacao_inicial,
      fase_inicial: cfg.fase_inicial,
    };
  }

  private previewPdfItemFromSkill(
    arquivo: string,
    itemId: string,
    resultado: SkillExtractResult,
    cls: { cor: PdfSemaforoCor; alertas: string[] },
    duplicata: boolean,
    processoExistenteId: string | undefined,
  ): PdfPreviewItem {
    const proc = resultado.processo;
    const conf = Number(resultado.confidence) || 0;
    return {
      arquivo,
      itemId,
      numero: proc ? emptyToNull(proc.numero) : null,
      clienteNome: proc ? emptyToNull(proc.cliente_nome) : null,
      clienteCpf: proc ? emptyToNull(proc.cliente_cpf) : null,
      reuTexto: proc ? emptyToNull(proc.reu_texto) : null,
      vara: proc ? emptyToNull(proc.vara) : null,
      materia: proc ? emptyToNull(proc.materia) : null,
      sistema: proc ? emptyToNull(proc.sistema) : null,
      login: proc ? emptyToNull(proc.login) : null,
      dataDistribuicao: proc ? parseBrDate(proc.data_distribuicao) : null,
      dataAudiencia: proc ? parseBrDate(proc.data_audiencia) : null,
      horaAudiencia: proc ? normalizeTime(proc.hora_audiencia) : null,
      cor: cls.cor,
      alertas: cls.alertas,
      confidence: conf,
      duplicata,
      ...(processoExistenteId ? { processoExistenteId } : {}),
    };
  }

  private async previewUmPdf(
    escritorioId: string,
    file: Express.Multer.File,
    config: Record<string, unknown>,
  ): Promise<PdfPreviewItem> {
    const nome =
      file.originalname
        ?.replace(/^.*[/\\]/g, '')
        .replace(/\0/g, '')
        .trim()
        .slice(0, 200) || 'documento.pdf';
    const itemId = randomUUID();
    try {
      const resultado = await this.skill.extract(file.buffer, nome, config);
      const numeroRaw = resultado.processo
        ? String(resultado.processo.numero ?? '').trim()
        : '';
      let processoExistenteId: string | undefined;
      let duplicata = false;
      if (numeroRaw) {
        const dupId = await this.obterProcessoIdPorDigitos(
          escritorioId,
          numeroRaw,
        );
        if (dupId) {
          duplicata = true;
          processoExistenteId = dupId;
        }
      }
      const cls = classificarResultadoSkill(resultado, duplicata);
      return this.previewPdfItemFromSkill(
        nome,
        itemId,
        resultado,
        cls,
        duplicata,
        processoExistenteId,
      );
    } catch (err) {
      const msg =
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
          ? (err as Error).message
          : err instanceof Error
            ? err.message
            : String(err);
      return {
        arquivo: nome,
        itemId,
        numero: null,
        clienteNome: null,
        clienteCpf: null,
        reuTexto: null,
        vara: null,
        materia: null,
        sistema: null,
        login: null,
        dataDistribuicao: null,
        dataAudiencia: null,
        horaAudiencia: null,
        cor: 'VERMELHO',
        alertas: [msg],
        confidence: 0,
        duplicata: false,
      };
    }
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
