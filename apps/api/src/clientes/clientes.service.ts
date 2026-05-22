import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { processoProcedente } from '../db/schema/processo-procedente';
import { CalcularPrazoProcessualService } from '../encadeamentos/calcular-prazo-processual.service';

function normCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly prazos: CalcularPrazoProcessualService,
  ) {}

  async listarProcessosPorCpf(escritorioId: string, cpf: string) {
    const digits = normCpf(cpf);
    if (digits.length < 11) {
      return [];
    }
    const rows = await this.drizzle.db
      .select({
        id: processo.id,
        numero: processo.numero,
        clienteNome: processo.clienteNome,
        reuTexto: processo.reuTexto,
        vara: processo.vara,
        faseAtual: processo.faseAtual,
        statusProcesso: processo.statusProcesso,
        materia: processo.materia,
        updatedAt: processo.updatedAt,
      })
      .from(processo)
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`regexp_replace(${processo.clienteCpf}, '[^0-9]', '', 'g') = ${digits}`,
        ),
      )
      .orderBy(desc(processo.updatedAt));
    return rows.map((r) => ({
      processoId: r.id,
      numero: r.numero,
      clienteNome: r.clienteNome,
      reuTexto: r.reuTexto,
      vara: r.vara,
      faseAtual: r.faseAtual,
      statusProcesso: r.statusProcesso,
      materia: r.materia,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Verificação pós-SerasaJud — aceita relatório manual de novas restrições.
   * Se houver itens, cria pendência VERIFICAR_NOVA_NEGATIVACAO (ADV, 7d).
   */
  async restricoesAtivas(
    escritorioId: string,
    cpf: string,
    relatorio?: string | null,
  ) {
    const digits = normCpf(cpf);
    const restricoes: { descricao: string; origem: string }[] = [];

    if (relatorio?.trim()) {
      for (const linha of relatorio.split('\n').map((l) => l.trim()).filter(Boolean)) {
        restricoes.push({ descricao: linha, origem: 'MANUAL' });
      }
    }

    const processos = await this.listarProcessosPorCpf(escritorioId, digits);
    let pendenciaCriada = false;

    if (restricoes.length > 0 && processos.length > 0) {
      const procId = processos[0]!.processoId;
      const hoje = hojeYmd();
      const dataLimite = await this.prazos.calcular(escritorioId, 7, hoje);
      const obs = restricoes.map((r) => r.descricao).join('; ');
      await this.drizzle.db.insert(pendencia).values({
        escritorioId,
        processoId: procId,
        tipo: 'VERIFICAR_NOVA_NEGATIVACAO',
        dataAbertura: hoje,
        dataLimite,
        responsavel: 'ADV',
        status: 'ABERTA',
        observacao: obs,
        origem: 'SERASAJUD',
        fila: 'ADV',
      });
      pendenciaCriada = true;
    }

    const [pp] = await this.drizzle.db
      .select({
        serasajud: processoProcedente.serasajudAcionado,
        cumprida: processoProcedente.obrigacaoFazerCumprida,
      })
      .from(processoProcedente)
      .innerJoin(processo, eq(processo.id, processoProcedente.processoId))
      .where(
        and(
          eq(processo.escritorioId, escritorioId),
          sql`regexp_replace(${processo.clienteCpf}, '[^0-9]', '', 'g') = ${digits}`,
          eq(processoProcedente.serasajudAcionado, true),
        ),
      )
      .limit(1);

    return {
      cpf: digits,
      restricoes,
      processosVinculados: processos.length,
      serasajudAtivo: !!pp?.serasajud,
      obrigacaoCumprida: !!pp?.cumprida,
      pendenciaCriada,
    };
  }
}
