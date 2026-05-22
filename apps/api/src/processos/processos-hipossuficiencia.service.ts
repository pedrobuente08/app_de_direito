import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { comarca } from '../db/schema/comarca';
import { pendencia } from '../db/schema/pendencia';
import { processo } from '../db/schema/processo';
import { CalcularPrazoProcessualService } from '../encadeamentos/calcular-prazo-processual.service';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ProcessosHipossuficienciaService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly prazos: CalcularPrazoProcessualService,
  ) {}

  private async assertProcesso(escritorioId: string, processoId: string) {
    const [row] = await this.drizzle.db
      .select({ hipossuficienciaComprovada: processo.hipossuficienciaComprovada })
      .from(processo)
      .where(
        and(eq(processo.escritorioId, escritorioId), eq(processo.id, processoId)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Processo não encontrado');
    }
    return row;
  }

  /** Cria pendência ATENDIMENTO se hipossuficiência não comprovada. */
  async garantirPendenciaSeNecessario(
    escritorioId: string,
    processoId: string,
    observacao?: string | null,
  ): Promise<boolean> {
    const p = await this.assertProcesso(escritorioId, processoId);
    if (p.hipossuficienciaComprovada) return false;

    const hoje = hojeYmd();
    const [existente] = await this.drizzle.db
      .select({ id: pendencia.id })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.tipo, 'SOLICITAR_DOC_HIPOSSUFICIENCIA'),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .limit(1);
    if (existente) return false;

    const dataLimite = await this.prazos.calcular(escritorioId, 5, hoje);
    await this.drizzle.db.insert(pendencia).values({
      escritorioId,
      processoId,
      tipo: 'SOLICITAR_DOC_HIPOSSUFICIENCIA',
      dataAbertura: hoje,
      dataLimite,
      responsavel: 'ATENDIMENTO',
      status: 'ABERTA',
      observacao: observacao?.trim() || null,
      origem: 'AUTOMATICO',
      fila: 'ATENDIMENTO',
    });
    return true;
  }

  /** Vara com exigência frequente de documentação — contato proativo (I.8). */
  async aplicarContatoProativoVara(
    escritorioId: string,
    processoId: string,
    vara: string | null | undefined,
  ): Promise<void> {
    if (!vara?.trim()) return;
    const v = vara.trim();
    const [cm] = await this.drizzle.db
      .select({
        exige: comarca.exigeDocFrequente,
        perfil: comarca.perfilDiligencia,
      })
      .from(comarca)
      .where(
        and(
          eq(comarca.escritorioId, escritorioId),
          or(
            ilike(comarca.nome, `%${v}%`),
            ilike(comarca.abreviado, `%${v}%`),
            eq(comarca.codigo, v),
          ),
        ),
      )
      .limit(1);
    if (!cm?.exige) return;

    await this.drizzle.db
      .update(processo)
      .set({ varaExigeDocFrequente: true, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      );

    const hoje = hojeYmd();
    const [existente] = await this.drizzle.db
      .select({ id: pendencia.id })
      .from(pendencia)
      .where(
        and(
          eq(pendencia.escritorioId, escritorioId),
          eq(pendencia.processoId, processoId),
          eq(pendencia.tipo, 'SOLICITAR_PROCURACAO_ATUALIZADA'),
          eq(pendencia.status, 'ABERTA'),
        ),
      )
      .limit(1);
    if (existente) return;

    const dataLimite = await this.prazos.calcular(escritorioId, 5, hoje);
    await this.drizzle.db.insert(pendencia).values({
      escritorioId,
      processoId,
      tipo: 'SOLICITAR_PROCURACAO_ATUALIZADA',
      dataAbertura: hoje,
      dataLimite,
      responsavel: 'ATENDIMENTO',
      status: 'ABERTA',
      observacao: 'Vara com exigência frequente de documentação',
      origem: 'AUTOMATICO',
      fila: 'ATENDIMENTO',
    });
  }
}
