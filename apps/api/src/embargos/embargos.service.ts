import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { AddonsService } from '../addons/addons.service';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { DrizzleService } from '../db/drizzle.service';
import { embargosDeclaracao } from '../db/schema/embargos-declaracao';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { sentenca } from '../db/schema/sentenca';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { EscritorioService } from '../escritorio/escritorio.service';
import { ProcessosService } from '../processos/processos.service';
import type { InterporEmbargosDto } from './dto/interpor-embargos.dto';
import type { RegistrarResultadoEmbargosDto } from './dto/registrar-resultado-embargos.dto';

const FASE_AGUARDANDO_ED = 'AGUARDANDO_DECISAO_EMBARGOS_DEC';
const SUSPEND_MARKER = '[ED: prazo recurso suspenso]';

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

@Injectable()
export class EmbargosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly addons: AddonsService,
    private readonly processos: ProcessosService,
    private readonly escritorio: EscritorioService,
    private readonly encadeamentos: EncadeamentosQueueService,
  ) {}

  async listarPorProcesso(escritorioId: string, processoId: string) {
    await this.addons.assertEnabled(escritorioId, 'recursos_avancados');
    await this.processos.obterPorId(escritorioId, processoId);

    return this.drizzle.db
      .select()
      .from(embargosDeclaracao)
      .where(
        and(
          eq(embargosDeclaracao.escritorioId, escritorioId),
          eq(embargosDeclaracao.processoId, processoId),
        ),
      )
      .orderBy(desc(embargosDeclaracao.dataInterposicao));
  }

  async interpor(escritorioId: string, dto: InterporEmbargosDto) {
    await this.addons.assertEnabled(escritorioId, 'recursos_avancados');
    await this.processos.obterPorId(escritorioId, dto.processoId);

    const [sent] = await this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.id, dto.sentencaId),
          eq(sentenca.processoId, dto.processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .limit(1);

    if (!sent) {
      throw new NotFoundException('Sentença não encontrada para este processo.');
    }
    if (!isPrimeiroGrau(sent.grau)) {
      throw new BadRequestException(
        'Embargos de declaração aplicam-se à sentença de 1º grau.',
      );
    }

    const interrompe = dto.interrompePrazoRecurso !== false;
    const db = this.drizzle.db;

    const [row] = await db
      .insert(embargosDeclaracao)
      .values({
        sentencaId: dto.sentencaId,
        processoId: dto.processoId,
        escritorioId,
        origem: dto.origem,
        dataInterposicao: dto.dataInterposicao,
        prazoJulgamento: dto.prazoJulgamento ?? null,
        observacoes: dto.observacoes?.trim() || null,
        interrompePrazoRecurso: interrompe,
        resultado: 'A_JULGAR',
      })
      .returning();

    await this.definirFase(escritorioId, dto.processoId, FASE_AGUARDANDO_ED);

    if (interrompe) {
      await this.suspenderPrazoRecurso(escritorioId, dto.processoId);
    }

    if (dto.origem === 'NOS' || dto.origem === 'AMBOS') {
      await this.encadeamentos.dispatch(
        escritorioId,
        'embargos_interpostos_por_nos',
        {
          processoId: dto.processoId,
          observacao: dto.observacoes ?? null,
        },
      );
    }

    return row;
  }

  async registrarResultado(
    escritorioId: string,
    embargosId: string,
    dto: RegistrarResultadoEmbargosDto,
  ) {
    await this.addons.assertEnabled(escritorioId, 'recursos_avancados');

    const [emb] = await this.drizzle.db
      .select()
      .from(embargosDeclaracao)
      .where(
        and(
          eq(embargosDeclaracao.id, embargosId),
          eq(embargosDeclaracao.escritorioId, escritorioId),
        ),
      )
      .limit(1);

    if (!emb) {
      throw new NotFoundException('Embargos não encontrados.');
    }
    if (emb.resultado && emb.resultado !== 'A_JULGAR') {
      throw new BadRequestException('Resultado já registrado para estes embargos.');
    }

    const obs =
      [emb.observacoes, dto.observacoes?.trim()].filter(Boolean).join('\n') ||
      null;

    const [updated] = await this.drizzle.db
      .update(embargosDeclaracao)
      .set({
        resultado: dto.resultado,
        dataJulgamento: dto.dataJulgamento,
        observacoes: obs,
      })
      .where(eq(embargosDeclaracao.id, embargosId))
      .returning();

    if (emb.interrompePrazoRecurso) {
      if (dto.resultado === 'REJEITADOS') {
        await this.reiniciarPrazoRecurso(
          escritorioId,
          emb.processoId,
          dto.dataJulgamento,
        );
        await this.definirFase(escritorioId, emb.processoId, 'EM_RECURSO');
      } else {
        await this.restaurarOuRevisarPrazo(escritorioId, emb.processoId);
        const faseNova =
          dto.resultado === 'ACOLHIDOS'
            ? 'AGUARDANDO_SENTENCA'
            : 'EM_RECURSO';
        await this.definirFase(escritorioId, emb.processoId, faseNova);

        if (dto.resultado === 'ACOLHIDOS') {
          const [sentRow] = await this.drizzle.db
            .select({ observacoes: sentenca.observacoes })
            .from(sentenca)
            .where(eq(sentenca.id, emb.sentencaId))
            .limit(1);
          const newObs = [
            sentRow?.observacoes,
            `[ED acolhidos em ${dto.dataJulgamento}]`,
          ]
            .filter(Boolean)
            .join('\n');
          await this.drizzle.db
            .update(sentenca)
            .set({ observacoes: newObs })
            .where(eq(sentenca.id, emb.sentencaId));
        }
      }
    }

    return updated;
  }

  /** IDs de processos com embargos pendentes de julgamento. */
  async processosComEmbargosAbertos(escritorioId: string): Promise<Set<string>> {
    const rows = await this.drizzle.db
      .select({ processoId: embargosDeclaracao.processoId })
      .from(embargosDeclaracao)
      .where(
        and(
          eq(embargosDeclaracao.escritorioId, escritorioId),
          or(
            isNull(embargosDeclaracao.resultado),
            eq(embargosDeclaracao.resultado, 'A_JULGAR'),
          ),
        ),
      );
    return new Set(rows.map((r) => r.processoId));
  }

  private async definirFase(
    escritorioId: string,
    processoId: string,
    fase: string,
  ) {
    await this.drizzle.db
      .update(processo)
      .set({ faseAtual: fase, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      );
  }

  private async prazoElaborarRecursoDias(escritorioId: string): Promise<number> {
    const tenant = await this.escritorio.obterPerfilTenant(escritorioId);
    const cfg = (tenant.config ?? {}) as EscritorioConfig;
    return cfg.prazo_elaborar_recurso_dias ?? 10;
  }

  private async suspenderPrazoRecurso(escritorioId: string, processoId: string) {
    const pends = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    for (const p of pends) {
      if (!p.tipo.toUpperCase().includes('RECURSO')) continue;
      const obs = p.observacao?.includes(SUSPEND_MARKER)
        ? p.observacao
        : [p.observacao, `${SUSPEND_MARKER} limite=${p.dataLimite ?? '—'}`]
            .filter(Boolean)
            .join('\n');
      await this.drizzle.db
        .update(pendencia)
        .set({ dataLimite: null, observacao: obs })
        .where(eq(pendencia.id, p.id));
    }
  }

  private async reiniciarPrazoRecurso(
    escritorioId: string,
    processoId: string,
    dataJulgamento: string,
  ) {
    const dias = await this.prazoElaborarRecursoDias(escritorioId);
    const novoLimite = addDaysYmd(dataJulgamento, dias);

    const pends = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    let atualizou = false;
    for (const p of pends) {
      if (!p.tipo.toUpperCase().includes('RECURSO')) continue;
      const obs = (p.observacao ?? '')
        .replace(SUSPEND_MARKER, '[ED: prazo reiniciado após rejeição]')
        .trim();
      await this.drizzle.db
        .update(pendencia)
        .set({
          dataLimite: novoLimite,
          observacao: obs || null,
        })
        .where(eq(pendencia.id, p.id));
      atualizou = true;
    }

    if (!atualizou) {
      const hoje = new Date().toISOString().slice(0, 10);
      await this.drizzle.db.insert(pendencia).values({
        escritorioId,
        processoId,
        tipo: 'ELABORAR_RECURSO',
        dataAbertura: hoje,
        dataLimite: novoLimite,
        status: 'ABERTA',
        origem: 'EMBARGOS_ED',
        fila: 'ADV',
        observacao: 'Prazo reiniciado após rejeição dos embargos de declaração.',
      });
    }
  }

  private async restaurarOuRevisarPrazo(
    escritorioId: string,
    processoId: string,
  ) {
    const pends = await this.drizzle.db
      .select()
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    for (const p of pends) {
      if (!p.observacao?.includes(SUSPEND_MARKER)) continue;
      const match = p.observacao.match(/limite=([0-9]{4}-[0-9]{2}-[0-9]{2}|—)/);
      const limite =
        match && match[1] !== '—' ? match[1] : addDaysYmd(new Date().toISOString().slice(0, 10), 10);
      const obs = p.observacao
        .replace(SUSPEND_MARKER, '[ED: sentença alterada — revisar prazo]')
        .trim();
      await this.drizzle.db
        .update(pendencia)
        .set({ dataLimite: limite, observacao: obs })
        .where(eq(pendencia.id, p.id));
    }
  }
}
