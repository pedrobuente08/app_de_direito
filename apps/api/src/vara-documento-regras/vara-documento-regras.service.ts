import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { varaDocumentoRegra } from '../db/schema/vara-documento-regra';
import type { CreateVaraDocumentoRegraDto } from './dto/create-vara-documento-regra.dto';
import type { UpdateVaraDocumentoRegraDto } from './dto/update-vara-documento-regra.dto';

@Injectable()
export class VaraDocumentoRegrasService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select()
      .from(varaDocumentoRegra)
      .where(eq(varaDocumentoRegra.escritorioId, escritorioId))
      .orderBy(desc(varaDocumentoRegra.createdAt))
      .limit(limit);
  }

  async criar(escritorioId: string, dto: CreateVaraDocumentoRegraDto) {
    const [row] = await this.drizzle.db
      .insert(varaDocumentoRegra)
      .values({
        escritorioId,
        vara: dto.vara.trim(),
        tipoDocumento: dto.tipoDocumento?.trim() || null,
        formatoDocumento: dto.formatoDocumento?.trim() || null,
        aceita: dto.aceita,
        observacao: dto.observacao?.trim() || null,
      })
      .returning();
    return row;
  }

  private async obter(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(varaDocumentoRegra)
      .where(
        and(
          eq(varaDocumentoRegra.escritorioId, escritorioId),
          eq(varaDocumentoRegra.id, id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Regra não encontrada');
    }
    return row;
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateVaraDocumentoRegraDto,
  ) {
    await this.obter(escritorioId, id);
    const patch: Partial<typeof varaDocumentoRegra.$inferInsert> = {};
    if (dto.vara !== undefined) {
      patch.vara = dto.vara.trim();
    }
    if (dto.tipoDocumento !== undefined) {
      patch.tipoDocumento = dto.tipoDocumento?.trim() || null;
    }
    if (dto.formatoDocumento !== undefined) {
      patch.formatoDocumento = dto.formatoDocumento?.trim() || null;
    }
    if (dto.aceita !== undefined) {
      patch.aceita = dto.aceita;
    }
    if (dto.observacao !== undefined) {
      patch.observacao = dto.observacao?.trim() || null;
    }
    const [row] = await this.drizzle.db
      .update(varaDocumentoRegra)
      .set(patch)
      .where(
        and(
          eq(varaDocumentoRegra.escritorioId, escritorioId),
          eq(varaDocumentoRegra.id, id),
        ),
      )
      .returning();
    return row;
  }

  async remover(escritorioId: string, id: string) {
    await this.obter(escritorioId, id);
    await this.drizzle.db
      .delete(varaDocumentoRegra)
      .where(
        and(
          eq(varaDocumentoRegra.escritorioId, escritorioId),
          eq(varaDocumentoRegra.id, id),
        ),
      );
    return { ok: true };
  }
}
