import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { AddonsService } from '../addons/addons.service';
import { DrizzleService } from '../db/drizzle.service';
import { parceiro, parceiroMateria } from '../db/schema/parceiro';
import { processo } from '../db/schema/processo';

@Injectable()
export class ParceirosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly addons: AddonsService,
  ) {}

  async listar(escritorioId: string) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    return this.drizzle.db
      .select()
      .from(parceiro)
      .where(eq(parceiro.escritorioId, escritorioId));
  }

  async criar(
    escritorioId: string,
    dto: {
      nome: string;
      tipo: 'PF' | 'ESCRITORIO';
      cpfCnpj?: string;
      comissaoPercentual?: string;
      corHex?: string;
    },
  ) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    const [row] = await this.drizzle.db
      .insert(parceiro)
      .values({
        escritorioId,
        nome: dto.nome.trim(),
        tipo: dto.tipo,
        cpfCnpj: dto.cpfCnpj?.trim() || null,
        comissaoPercentual: dto.comissaoPercentual ?? null,
        corHex: dto.corHex?.trim() || null,
      })
      .returning();
    return row;
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: Partial<{
      nome: string;
      tipo: 'PF' | 'ESCRITORIO';
      cpfCnpj: string | null;
      comissaoPercentual: string | null;
      corHex: string | null;
      ativo: boolean;
    }>,
  ) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    const [updated] = await this.drizzle.db
      .update(parceiro)
      .set({
        ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.cpfCnpj !== undefined ? { cpfCnpj: dto.cpfCnpj } : {}),
        ...(dto.comissaoPercentual !== undefined
          ? { comissaoPercentual: dto.comissaoPercentual }
          : {}),
        ...(dto.corHex !== undefined ? { corHex: dto.corHex } : {}),
        ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      })
      .where(and(eq(parceiro.id, id), eq(parceiro.escritorioId, escritorioId)))
      .returning();
    if (!updated) throw new NotFoundException('Parceiro não encontrado.');
    return updated;
  }

  async remover(escritorioId: string, id: string) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    await this.drizzle.db
      .delete(parceiro)
      .where(and(eq(parceiro.id, id), eq(parceiro.escritorioId, escritorioId)));
  }

  async listarMaterias(escritorioId: string) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    return this.drizzle.db
      .select({
        id: parceiroMateria.id,
        materia: parceiroMateria.materia,
        parceiroId: parceiroMateria.parceiroId,
        parceiroNome: parceiro.nome,
      })
      .from(parceiroMateria)
      .innerJoin(parceiro, eq(parceiro.id, parceiroMateria.parceiroId))
      .where(eq(parceiroMateria.escritorioId, escritorioId));
  }

  async criarMateria(
    escritorioId: string,
    dto: { parceiroId: string; materia: string },
  ) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    const materia = dto.materia.trim().toUpperCase();
    const [row] = await this.drizzle.db
      .insert(parceiroMateria)
      .values({
        escritorioId,
        parceiroId: dto.parceiroId,
        materia,
      })
      .returning();
    return row;
  }

  async removerMateria(escritorioId: string, id: string) {
    await this.addons.assertEnabled(escritorioId, 'captacao');
    await this.drizzle.db
      .delete(parceiroMateria)
      .where(
        and(eq(parceiroMateria.id, id), eq(parceiroMateria.escritorioId, escritorioId)),
      );
  }

  /** Auto-preenche parceiro_id por matéria ou texto "Parceria <nome>". */
  async resolverParceiroParaProcesso(
    escritorioId: string,
    materia: string | null | undefined,
    observacaoGeral: string | null | undefined,
  ): Promise<string | null> {
    const enabled = await this.addons.isEnabled(escritorioId, 'captacao');
    if (!enabled) return null;

    if (materia?.trim()) {
      const [map] = await this.drizzle.db
        .select({ parceiroId: parceiroMateria.parceiroId })
        .from(parceiroMateria)
        .where(
          and(
            eq(parceiroMateria.escritorioId, escritorioId),
            eq(parceiroMateria.materia, materia.trim().toUpperCase()),
          ),
        )
        .limit(1);
      if (map) return map.parceiroId;
    }

    const obs = observacaoGeral ?? '';
    const match = obs.match(/parceria\s+([^\n,;]+)/i);
    if (match?.[1]) {
      const nome = match[1].trim();
      const [p] = await this.drizzle.db
        .select({ id: parceiro.id })
        .from(parceiro)
        .where(
          and(
            eq(parceiro.escritorioId, escritorioId),
            ilike(parceiro.nome, nome),
          ),
        )
        .limit(1);
      if (p) return p.id;
    }
    return null;
  }

  async aplicarParceiroNoProcesso(
    escritorioId: string,
    processoId: string,
    parceiroId: string,
  ) {
    await this.drizzle.db
      .update(processo)
      .set({ parceiroId, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      );
  }
}
