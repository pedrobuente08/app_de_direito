import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { improcedente } from '../db/schema/improcedente';
import { processo } from '../db/schema/processo';
import type { UpdateImprocedenteDto } from './dto/update-improcedente.dto';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ImprocedentesService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select({
        id: improcedente.id,
        processoId: improcedente.processoId,
        escritorioId: improcedente.escritorioId,
        valorSucumbencia: improcedente.valorSucumbencia,
        destinatarioSucumbencia: improcedente.destinatarioSucumbencia,
        statusPagamento: improcedente.statusPagamento,
        dataPrazoPagamento: improcedente.dataPrazoPagamento,
        dataPagamento: improcedente.dataPagamento,
        decisaoRecurso: improcedente.decisaoRecurso,
        certidaoCreditoSolicitada: improcedente.certidaoCreditoSolicitada,
        certidaoCreditoData: improcedente.certidaoCreditoData,
        createdAt: improcedente.createdAt,
        updatedAt: improcedente.updatedAt,
        numero: processo.numero,
        clienteNome: processo.clienteNome,
        materia: processo.materia,
        vara: processo.vara,
        justicaGratuita: processo.justicaGratuita,
        litiganciaMaFe: processo.litiganciaMaFe,
        avaliacaoRecurso: processo.avaliacaoRecurso,
        faseAtual: processo.faseAtual,
      })
      .from(improcedente)
      .innerJoin(processo, eq(improcedente.processoId, processo.id))
      .where(eq(improcedente.escritorioId, escritorioId))
      .orderBy(desc(improcedente.createdAt))
      .limit(limit);
  }

  async resumo(escritorioId: string) {
    const rows = await this.listar(escritorioId, 2000);
    const hoje = hojeYmd();
    let emAvaliacao = 0;
    let sucumbenciaAPagar = 0;
    let venceEm15 = 0;
    let passivoTotal = 0;

    for (const r of rows) {
      const av = r.avaliacaoRecurso as { ativa?: boolean } | null;
      if (av?.ativa) emAvaliacao += 1;
      if (r.decisaoRecurso === 'AVALIAR' || av?.ativa) continue;

      const status = (r.statusPagamento ?? '').toUpperCase();
      if (r.justicaGratuita || status === 'PAGO' || status === 'SUSPENSO') {
        continue;
      }
      if (status === 'A_PAGAR') {
        sucumbenciaAPagar += 1;
        const v = parseFloat(String(r.valorSucumbencia ?? '0'));
        if (!Number.isNaN(v)) passivoTotal += v;
        const prazo = r.dataPrazoPagamento;
        if (prazo && prazo >= hoje && prazo <= addDaysYmd(hoje, 15)) {
          venceEm15 += 1;
        }
      }
    }

    return {
      total: rows.length,
      emAvaliacao,
      sucumbenciaAPagar,
      venceEm15,
      passivoTotal: passivoTotal.toFixed(2),
    };
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateImprocedenteDto,
  ) {
    const [row] = await this.drizzle.db
      .select()
      .from(improcedente)
      .where(
        and(eq(improcedente.id, id), eq(improcedente.escritorioId, escritorioId)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Registro de improcedente não encontrado.');
    }

    const patch: Partial<typeof improcedente.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.valorSucumbencia !== undefined) {
      patch.valorSucumbencia = dto.valorSucumbencia;
    }
    if (dto.destinatarioSucumbencia !== undefined) {
      patch.destinatarioSucumbencia = dto.destinatarioSucumbencia;
    }
    if (dto.statusPagamento !== undefined) {
      patch.statusPagamento = dto.statusPagamento;
    }
    if (dto.dataPrazoPagamento !== undefined) {
      patch.dataPrazoPagamento = dto.dataPrazoPagamento;
    }
    if (dto.dataPagamento !== undefined) {
      patch.dataPagamento = dto.dataPagamento;
    }

    await this.drizzle.db
      .update(improcedente)
      .set(patch)
      .where(eq(improcedente.id, id));

    if (dto.justicaGratuita !== undefined) {
      await this.drizzle.db
        .update(processo)
        .set({
          justicaGratuita: dto.justicaGratuita,
          updatedAt: new Date(),
        })
        .where(eq(processo.id, row.processoId));
    }

    const lista = await this.listar(escritorioId, 2000);
    return lista.find((x) => x.id === id) ?? row;
  }

  async solicitarCertidaoCredito(escritorioId: string, id: string) {
    const [imp] = await this.drizzle.db
      .select({
        imp: improcedente,
        litigancia: processo.litiganciaMaFe,
        decisao: improcedente.decisaoRecurso,
      })
      .from(improcedente)
      .innerJoin(processo, eq(improcedente.processoId, processo.id))
      .where(
        and(eq(improcedente.id, id), eq(improcedente.escritorioId, escritorioId)),
      )
      .limit(1);

    if (!imp) {
      throw new NotFoundException('Registro de improcedente não encontrado.');
    }
    if (!imp.litigancia) {
      throw new BadRequestException(
        'Certidão de crédito exige processo com litigância de má-fé.',
      );
    }
    const dec = (imp.decisao ?? '').toUpperCase();
    if (dec === 'RECORRER' || dec === 'AVALIAR') {
      throw new BadRequestException(
        'Processo ainda com recurso ativo — não é possível solicitar certidão.',
      );
    }

    const hoje = hojeYmd();
    await this.drizzle.db
      .update(improcedente)
      .set({
        certidaoCreditoSolicitada: true,
        certidaoCreditoData: hoje,
        statusPagamento: 'CERTIDAO_CREDITO',
        updatedAt: new Date(),
      })
      .where(eq(improcedente.id, id));

    const lista = await this.listar(escritorioId, 2000);
    return lista.find((x) => x.id === id);
  }
}

function addDaysYmd(baseYmd: string, days: number): string {
  const d = new Date(`${baseYmd.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
