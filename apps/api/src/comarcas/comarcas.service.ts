import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { comarca } from '../db/schema/comarca';
import { EscritorioService } from '../escritorio/escritorio.service';
import type { CreateComarcaDto } from './dto/create-comarca.dto';
import type { UpdateComarcaDto } from './dto/update-comarca.dto';

@Injectable()
export class ComarcasService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly escritorio: EscritorioService,
  ) {}

  async listar(escritorioId: string) {
    return this.drizzle.db
      .select()
      .from(comarca)
      .where(eq(comarca.escritorioId, escritorioId));
  }

  async criar(escritorioId: string, dto: CreateComarcaDto) {
    try {
      const [row] = await this.drizzle.db
        .insert(comarca)
        .values({
          escritorioId,
          codigo: dto.codigo.trim(),
          nome: dto.nome.trim(),
          abreviado: dto.abreviado.trim(),
          perfilDiligencia: dto.perfilDiligencia ?? null,
          exigeDocFrequente: dto.exigeDocFrequente ?? false,
        })
        .returning();

      if (!row) {
        throw new ConflictException('Falha ao criar comarca');
      }
      this.escritorio.invalidarCacheSkill(escritorioId);
      return row;
    } catch (e) {
      if (e instanceof ConflictException) {
        throw e;
      }
      throw new ConflictException(
        'Não foi possível criar — código duplicado neste escritório?',
      );
    }
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateComarcaDto,
  ) {
    await this.obter(escritorioId, id);

    const patch: Partial<typeof comarca.$inferInsert> = {};
    if (dto.codigo !== undefined) {
      patch.codigo = dto.codigo.trim();
    }
    if (dto.nome !== undefined) {
      patch.nome = dto.nome.trim();
    }
    if (dto.abreviado !== undefined) {
      patch.abreviado = dto.abreviado.trim();
    }
    if (dto.perfilDiligencia !== undefined) {
      patch.perfilDiligencia = dto.perfilDiligencia;
    }
    if (dto.exigeDocFrequente !== undefined) {
      patch.exigeDocFrequente = dto.exigeDocFrequente;
    }

    if (!Object.keys(patch).length) {
      return this.obter(escritorioId, id);
    }

    try {
      await this.drizzle.db
        .update(comarca)
        .set(patch)
        .where(
          and(eq(comarca.escritorioId, escritorioId), eq(comarca.id, id)),
        );
    } catch {
      throw new ConflictException('Atualização conflitante (código único?)');
    }

    this.escritorio.invalidarCacheSkill(escritorioId);
    return this.obter(escritorioId, id);
  }

  async remover(escritorioId: string, id: string) {
    await this.obter(escritorioId, id);
    await this.drizzle.db
      .delete(comarca)
      .where(
        and(eq(comarca.escritorioId, escritorioId), eq(comarca.id, id)),
      );
    this.escritorio.invalidarCacheSkill(escritorioId);
    return { ok: true };
  }

  /** Comarcas frequentes TJBA + federais na BA (§3.3.2). */
  async seedPadraoBa(escritorioId: string) {
    const padrao: { codigo: string; nome: string; abreviado: string }[] = [
      { codigo: '0001', nome: 'Salvador', abreviado: 'SSA' },
      { codigo: '0020', nome: 'Feira de Santana', abreviado: 'FSA' },
      { codigo: '0022', nome: 'Vitória da Conquista', abreviado: 'VCA' },
      { codigo: '0025', nome: 'Ilhéus', abreviado: 'ILH' },
      { codigo: '0030', nome: 'Juazeiro', abreviado: 'JZR' },
      { codigo: '0033', nome: 'Barreiras', abreviado: 'BRR' },
      { codigo: '0038', nome: 'Lauro de Freitas', abreviado: 'LFT' },
      { codigo: '0040', nome: 'Porto Seguro', abreviado: 'PTS' },
      { codigo: '0045', nome: 'Jequié', abreviado: 'JEQ' },
      { codigo: '0050', nome: 'Alagoinhas', abreviado: 'AGS' },
    ];
    let inseridas = 0;
    for (const row of padrao) {
      try {
        await this.drizzle.db
          .insert(comarca)
          .values({ escritorioId, ...row })
          .onConflictDoNothing();
        inseridas += 1;
      } catch {
        /* ignora duplicata */
      }
    }
    this.escritorio.invalidarCacheSkill(escritorioId);
    return { inseridas, totalPadrao: padrao.length };
  }

  private async obter(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(comarca)
      .where(
        and(eq(comarca.escritorioId, escritorioId), eq(comarca.id, id)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Comarca não encontrada');
    }
    return row;
  }
}
