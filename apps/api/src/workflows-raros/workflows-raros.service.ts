import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { AddonsService } from '../addons/addons.service';
import { DrizzleService } from '../db/drizzle.service';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoSucessor } from '../db/schema/processo-sucessor';
import { tutelaAntecipada } from '../db/schema/tutela-antecipada';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { FaseDerivacaoService } from '../fase-derivacao/fase-derivacao.service';
import { ProcessosService } from '../processos/processos.service';
import type {
  AtualizarTutelaDto,
  CriarTutelaDto,
  HabilitarSucessorDto,
  RegistrarAutorFalecidoDto,
} from './dto/workflows-raros.dto';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class WorkflowsRarosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly addons: AddonsService,
    private readonly processos: ProcessosService,
    private readonly encadeamentos: EncadeamentosQueueService,
    private readonly faseDerivacao: FaseDerivacaoService,
  ) {}

  async listarTutelas(escritorioId: string, processoId: string) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    await this.processos.obterPorId(escritorioId, processoId);
    return this.drizzle.db
      .select()
      .from(tutelaAntecipada)
      .where(
        and(
          eq(tutelaAntecipada.escritorioId, escritorioId),
          eq(tutelaAntecipada.processoId, processoId),
        ),
      )
      .orderBy(desc(tutelaAntecipada.pedidoEm));
  }

  async criarTutela(
    escritorioId: string,
    processoId: string,
    dto: CriarTutelaDto,
  ) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    await this.processos.obterPorId(escritorioId, processoId);
    const [row] = await this.drizzle.db
      .insert(tutelaAntecipada)
      .values({
        escritorioId,
        processoId,
        tipo: dto.tipo,
        pedidoEm: dto.pedidoEm,
        descricao: dto.descricao?.trim() || null,
        prazoCumprimento: dto.prazoCumprimento ?? null,
        resultado: 'PENDENTE',
      })
      .returning();
    return row;
  }

  async atualizarTutela(
    escritorioId: string,
    tutelaId: string,
    dto: AtualizarTutelaDto,
  ) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    const [t] = await this.drizzle.db
      .select()
      .from(tutelaAntecipada)
      .where(
        and(
          eq(tutelaAntecipada.id, tutelaId),
          eq(tutelaAntecipada.escritorioId, escritorioId),
        ),
      )
      .limit(1);
    if (!t) throw new NotFoundException('Tutela não encontrada.');

    const [updated] = await this.drizzle.db
      .update(tutelaAntecipada)
      .set({
        ...(dto.resultado !== undefined ? { resultado: dto.resultado } : {}),
        ...(dto.dataResultado !== undefined
          ? { dataResultado: dto.dataResultado }
          : {}),
        ...(dto.cumprida !== undefined ? { cumprida: dto.cumprida } : {}),
        ...(dto.cumpridaEm !== undefined ? { cumpridaEm: dto.cumpridaEm } : {}),
        ...(dto.observacoes !== undefined
          ? { observacoes: dto.observacoes?.trim() || null }
          : {}),
      })
      .where(eq(tutelaAntecipada.id, tutelaId))
      .returning();

    if (dto.resultado === 'DEFERIDA' || dto.resultado === 'PARCIALMENTE_DEFERIDA') {
      await this.encadeamentos.dispatch(escritorioId, 'tutela_deferida', {
        processoId: t.processoId,
      });
    } else if (dto.resultado === 'INDEFERIDA') {
      await this.encadeamentos.dispatch(escritorioId, 'tutela_indeferida', {
        processoId: t.processoId,
      });
    }

    return updated;
  }

  async listarSucessores(escritorioId: string, processoId: string) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    await this.processos.obterPorId(escritorioId, processoId);
    return this.drizzle.db
      .select()
      .from(processoSucessor)
      .where(
        and(
          eq(processoSucessor.escritorioId, escritorioId),
          eq(processoSucessor.processoId, processoId),
        ),
      );
  }

  async criarSucessor(
    escritorioId: string,
    processoId: string,
    dto: { nome: string; cpf?: string; parentesco?: string; observacoes?: string },
  ) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    await this.processos.obterPorId(escritorioId, processoId);
    const [row] = await this.drizzle.db
      .insert(processoSucessor)
      .values({
        escritorioId,
        processoId,
        nome: dto.nome.trim(),
        cpf: dto.cpf?.trim() || null,
        parentesco: dto.parentesco?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
      })
      .returning();
    await this.criarPendenciaSucessor(escritorioId, processoId, row.nome);
    return row;
  }

  async registrarAutorFalecido(
    escritorioId: string,
    processoId: string,
    dto: RegistrarAutorFalecidoDto,
  ) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    if (!dto.sucessores?.length) {
      throw new BadRequestException('Cadastre ao menos um sucessor.');
    }
    await this.processos.obterPorId(escritorioId, processoId);
    const motivo = `AUTOR_FALECIDO em ${dto.dataObito.slice(0, 10)}`;
    const db = this.drizzle.db;

    await db.transaction(async (tx) => {
      for (const s of dto.sucessores) {
        const [row] = await tx
          .insert(processoSucessor)
          .values({
            escritorioId,
            processoId,
            nome: s.nome.trim(),
            cpf: s.cpf?.trim() || null,
            parentesco: s.parentesco?.trim() || null,
            observacoes: dto.observacoes?.trim() || null,
          })
          .returning();
        await this.criarPendenciaSucessorTx(tx, escritorioId, processoId, row.nome);
      }
      await tx
        .update(processo)
        .set({
          statusProcesso: 'SOBRESTADO',
          sobrestamentoMotivo: motivo,
          sobrestadoDesde: dto.dataObito.slice(0, 10),
          updatedAt: new Date(),
        })
        .where(
          and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
        );
    });

    return this.processos.obterPorId(escritorioId, processoId);
  }

  async habilitarSucessor(
    escritorioId: string,
    sucessorId: string,
    dto: HabilitarSucessorDto,
  ) {
    await this.addons.assertEnabled(escritorioId, 'workflows_raros');
    const [s] = await this.drizzle.db
      .select()
      .from(processoSucessor)
      .where(
        and(
          eq(processoSucessor.id, sucessorId),
          eq(processoSucessor.escritorioId, escritorioId),
        ),
      )
      .limit(1);
    if (!s) throw new NotFoundException('Sucessor não encontrado.');

    const habilitadoEm = dto.habilitadoEm?.slice(0, 10) ?? hojeYmd();
    await this.drizzle.db
      .update(processoSucessor)
      .set({ habilitado: true, habilitadoEm })
      .where(eq(processoSucessor.id, sucessorId));

    const pendentes = await this.drizzle.db
      .select()
      .from(processoSucessor)
      .where(
        and(
          eq(processoSucessor.processoId, s.processoId),
          eq(processoSucessor.escritorioId, escritorioId),
          eq(processoSucessor.habilitado, false),
        ),
      );

    if (pendentes.length === 0) {
      const [principal] = await this.drizzle.db
        .select()
        .from(processoSucessor)
        .where(
          and(
            eq(processoSucessor.processoId, s.processoId),
            eq(processoSucessor.escritorioId, escritorioId),
            eq(processoSucessor.habilitado, true),
          ),
        )
        .limit(1);
      await this.drizzle.db
        .update(processo)
        .set({
          statusProcesso: 'ATIVO',
          clienteNome: principal?.nome ?? undefined,
          sobrestamentoMotivo: null,
          sobrestadoDesde: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(processo.id, s.processoId),
            eq(processo.escritorioId, escritorioId),
          ),
        );
      await this.faseDerivacao.aplicarAposMutacao(escritorioId, s.processoId);
    }

    const [updated] = await this.drizzle.db
      .select()
      .from(processoSucessor)
      .where(eq(processoSucessor.id, sucessorId))
      .limit(1);
    return updated!;
  }

  private async criarPendenciaSucessor(
    escritorioId: string,
    processoId: string,
    nome: string,
  ) {
    const hoje = hojeYmd();
    await this.drizzle.db.insert(pendencia).values({
      escritorioId,
      processoId,
      tipo: 'SOLICITAR_DOCUMENTOS_SUCESSOR',
      dataAbertura: hoje,
      dataLimite: addDaysYmd(hoje, 30),
      status: 'ABERTA',
      origem: 'AUTOR_FALECIDO',
      fila: 'ATENDIMENTO',
      observacao: `Herdeiro: ${nome}`,
    });
  }

  private async criarPendenciaSucessorTx(
    tx: Pick<DrizzleService['db'], 'insert'>,
    escritorioId: string,
    processoId: string,
    nome: string,
  ) {
    const hoje = hojeYmd();
    await tx.insert(pendencia).values({
      escritorioId,
      processoId,
      tipo: 'SOLICITAR_DOCUMENTOS_SUCESSOR',
      dataAbertura: hoje,
      dataLimite: addDaysYmd(hoje, 30),
      status: 'ABERTA',
      origem: 'AUTOR_FALECIDO',
      fila: 'ATENDIMENTO',
      observacao: `Herdeiro: ${nome}`,
    });
  }
}
