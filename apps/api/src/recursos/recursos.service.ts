import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { improcedente } from '../db/schema/improcedente';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { sentenca } from '../db/schema/sentenca';
import { FaseDerivada } from '../fase-derivacao/fase-derivacao.constants';
import { EncadeamentosQueueService } from '../encadeamentos/encadeamentos-queue.service';
import { ProcessosService } from '../processos/processos.service';
import type { RegistrarSegundoGrauDto } from './dto/registrar-segundo-grau.dto';

const SENT_PROC = new Set(['PROCEDENTE', 'PARCIAL', 'ACORDO']);

function isPrimeiroGrau(grau: string | null | undefined): boolean {
  if (!grau?.trim()) {
    return true;
  }
  const g = grau.trim().toUpperCase();
  return !g.includes('SEGUNDO') && g !== 'STJ' && g !== 'TST';
}

@Injectable()
export class RecursosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
    private readonly encadeamentos: EncadeamentosQueueService,
  ) {}

  /** Processos em recurso sem acórdão de 2º grau registrado. */
  async listar(escritorioId: string) {
    const db = this.drizzle.db;
    const rows = await db
      .select({
        processoId: processo.id,
        numero: processo.numero,
        clienteNome: processo.clienteNome,
        materia: processo.materia,
        vara: processo.vara,
        faseAtual: processo.faseAtual,
        decisaoRecurso: improcedente.decisaoRecurso,
        recursoOrigem: processoProcedente.recursoOrigem,
        recursoTipo: processoProcedente.recursoTipo,
        familiaSituacao: processoProcedente.familiaSituacao,
      })
      .from(processo)
      .leftJoin(improcedente, eq(improcedente.processoId, processo.id))
      .leftJoin(
        processoProcedente,
        eq(processoProcedente.processoId, processo.id),
      )
      .where(eq(processo.escritorioId, escritorioId))
      .orderBy(desc(processo.updatedAt));

    const comSegundo = new Set(
      (
        await db
          .select({ processoId: sentenca.processoId })
          .from(sentenca)
          .where(
            and(
              eq(sentenca.escritorioId, escritorioId),
              eq(sentenca.grau, 'SEGUNDO_GRAU'),
            ),
          )
      ).map((r) => r.processoId),
    );

    const emRecurso = rows.filter((r) => {
      if (comSegundo.has(r.processoId)) return false;
      const fase = (r.faseAtual ?? '').toUpperCase();
      if (fase.includes('RECURSO') || fase === FaseDerivada.EM_RECURSO.toUpperCase()) {
        return true;
      }
      const dec = (r.decisaoRecurso ?? '').toUpperCase();
      if (dec === 'RECORRER') return true;
      if (r.recursoOrigem || r.recursoTipo) return true;
      return false;
    });

    const uniq = new Map<string, (typeof emRecurso)[0]>();
    for (const r of emRecurso) {
      if (!uniq.has(r.processoId)) uniq.set(r.processoId, r);
    }

    const lista = Array.from(uniq.values());
    const pendenciasAbertas = await db
      .select({
        processoId: pendencia.processoId,
        tipo: pendencia.tipo,
        dataLimite: pendencia.dataLimite,
      })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.status, 'ABERTA'),
        ),
      );

    const pendPorProc = new Map<string, { tipo: string; dataLimite: string | null }[]>();
    for (const p of pendenciasAbertas) {
      const arr = pendPorProc.get(p.processoId) ?? [];
      arr.push({ tipo: p.tipo, dataLimite: p.dataLimite });
      pendPorProc.set(p.processoId, arr);
    }

    return lista.map((r) => {
      const pends = pendPorProc.get(r.processoId) ?? [];
      const pendRecurso = pends.find((p) =>
        p.tipo.toUpperCase().includes('RECURSO'),
      );
      let origem: 'NOSSO' | 'REU' | null = null;
      if (r.decisaoRecurso === 'RECORRER') origem = 'NOSSO';
      else if (r.recursoOrigem?.toUpperCase() === 'REU') origem = 'REU';
      else if (r.recursoOrigem?.toUpperCase() === 'NOSSO') origem = 'NOSSO';
      else if (r.familiaSituacao) origem = 'REU';

      return {
        processoId: r.processoId,
        numero: r.numero,
        clienteNome: r.clienteNome,
        materia: r.materia,
        vara: r.vara,
        faseAtual: r.faseAtual,
        origemRecurso: origem,
        tipoRecurso: r.recursoTipo,
        prazoManifestacao: pendRecurso?.dataLimite ?? null,
        pendenciaRecurso: pendRecurso?.tipo ?? null,
      };
    });
  }

  async resumo(escritorioId: string) {
    const lista = await this.listar(escritorioId);
    const hoje = new Date().toISOString().slice(0, 10);
    let manifestacao7d = 0;
    for (const r of lista) {
      const prazo = r.prazoManifestacao;
      if (!prazo) continue;
      if (prazo >= hoje && prazo <= addDaysYmd(hoje, 7)) manifestacao7d += 1;
    }
    return {
      totalEmRecurso: lista.length,
      manifestacao7d,
      aguardandoAcordao: lista.filter((r) => !r.prazoManifestacao).length,
      comDecisao: 0,
    };
  }

  private async assertSemSegundoGrau(escritorioId: string, processoId: string) {
    const [row] = await this.drizzle.db
      .select({ id: sentenca.id })
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, processoId),
          eq(sentenca.escritorioId, escritorioId),
          eq(sentenca.grau, 'SEGUNDO_GRAU'),
        ),
      )
      .limit(1);
    if (row) {
      throw new BadRequestException(
        'Já existe sentença de 2º grau registrada para este processo.',
      );
    }
  }

  private async ultimaSentencaPrimeiroGrau(
    escritorioId: string,
    processoId: string,
  ) {
    const rows = await this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .orderBy(desc(sentenca.data), desc(sentenca.createdAt));

    return rows.find((r) => isPrimeiroGrau(r.grau)) ?? null;
  }

  /**
   * E4 — Registra decisão de 2º grau e aplica efeitos do cenário A/B/C/D (PLANO_AJUSTES).
   */
  async registrarSegundoGrau(
    escritorioId: string,
    dto: RegistrarSegundoGrauDto,
  ) {
    await this.processos.obterPorId(escritorioId, dto.processoId);
    await this.assertSemSegundoGrau(escritorioId, dto.processoId);

    const s1 = await this.ultimaSentencaPrimeiroGrau(
      escritorioId,
      dto.processoId,
    );
    if (!s1) {
      throw new BadRequestException(
        'É necessário haver ao menos uma sentença de 1º grau antes do 2º grau.',
      );
    }

    const r1 = s1.resultado.trim().toUpperCase();
    const cen = dto.cenario;

    if ((cen === 'A' || cen === 'B') && r1 !== 'IMPROCEDENTE') {
      throw new BadRequestException(
        `Cenário ${cen} exige 1º grau IMPROCEDENTE (última de 1º grau: ${r1}).`,
      );
    }
    if ((cen === 'C' || cen === 'D') && !SENT_PROC.has(r1)) {
      throw new BadRequestException(
        `Cenário ${cen} exige 1º grau procedente, parcial ou acordo (última de 1º grau: ${r1}).`,
      );
    }

    if (cen === 'C' || cen === 'D') {
      const [pp] = await this.drizzle.db
        .select({ processoId: processoProcedente.processoId })
        .from(processoProcedente)
        .where(eq(processoProcedente.processoId, dto.processoId))
        .limit(1);
      if (!pp) {
        throw new BadRequestException(
          'Cenários C e D exigem linha em processo_procedente (réu recorreu / funil ativo).',
        );
      }
    }

    const obsPadrao = {
      A: '2º grau — provimento (E4-A)',
      B: '2º grau — recurso negado (E4-B)',
      C: '2º grau — manutenção (E4-C)',
      D: '2º grau — reforma (E4-D)',
    }[cen];
    const observacoes = dto.observacoes?.trim() || obsPadrao;

    const db = this.drizzle.db;

    await db.transaction(async (tx) => {
      if (cen === 'A') {
        await tx
          .delete(improcedente)
          .where(eq(improcedente.processoId, dto.processoId));
        await tx.insert(sentenca).values({
          escritorioId,
          processoId: dto.processoId,
          grau: 'SEGUNDO_GRAU',
          data: dto.data,
          valor: dto.valor ?? null,
          resultado: 'PROCEDENTE',
          favoravelPara: 'AUTOR',
          turma: dto.turma?.trim() || null,
          observacoes,
        });
        return;
      }

      if (cen === 'B') {
        await tx.insert(sentenca).values({
          escritorioId,
          processoId: dto.processoId,
          grau: 'SEGUNDO_GRAU',
          data: dto.data,
          valor: dto.valor ?? null,
          resultado: 'IMPROCEDENTE',
          favoravelPara: 'REU',
          turma: dto.turma?.trim() || null,
          observacoes,
        });
        await tx
          .delete(improcedente)
          .where(eq(improcedente.processoId, dto.processoId));
        await tx.insert(improcedente).values({
          escritorioId,
          processoId: dto.processoId,
          valorSucumbencia: dto.valor ?? null,
          statusPagamento: 'A_PAGAR',
          decisaoRecurso: 'NEGADO',
        });
        return;
      }

      if (cen === 'C') {
        await tx.insert(sentenca).values({
          escritorioId,
          processoId: dto.processoId,
          grau: 'SEGUNDO_GRAU',
          data: dto.data,
          valor: dto.valor ?? null,
          resultado: 'PROCEDENTE',
          favoravelPara: 'AUTOR',
          turma: dto.turma?.trim() || null,
          observacoes,
        });
        await tx
          .update(processoProcedente)
          .set({
            recursoResultado: 'MANTIDA',
            situacao: 'DECISAO_2G_MANTIDA',
            familiaSituacao: 'EXEC_ATIVA',
            updatedAt: new Date(),
          })
          .where(eq(processoProcedente.processoId, dto.processoId));
        return;
      }

      /* D */
      await tx.insert(sentenca).values({
        escritorioId,
        processoId: dto.processoId,
        grau: 'SEGUNDO_GRAU',
        data: dto.data,
        valor: dto.valor ?? null,
        resultado: 'IMPROCEDENTE',
        favoravelPara: 'REU',
        turma: dto.turma?.trim() || null,
        observacoes,
      });
      await tx
        .delete(improcedente)
        .where(eq(improcedente.processoId, dto.processoId));
      await tx.insert(improcedente).values({
        escritorioId,
        processoId: dto.processoId,
        valorSucumbencia: dto.valor ?? null,
        statusPagamento: 'A_PAGAR',
        decisaoRecurso: 'REFORMADA',
      });
    });

    await this.processos.recalcularProcedenteAposSentenca(
      escritorioId,
      dto.processoId,
    );

    if (cen === 'C' || cen === 'D') {
      await this.encadeamentos.dispatch(escritorioId, 'procedente_reu_recorre', {
        processoId: dto.processoId,
        observacao: observacoes,
      });
    }

    const lista = await this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, dto.processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .orderBy(desc(sentenca.data), desc(sentenca.createdAt));

    return { cenario: cen, sentencas: lista };
  }
}

function addDaysYmd(baseYmd: string, days: number): string {
  const d = new Date(`${baseYmd.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
