import { Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { escritorio } from '../db/schema/escritorio';
import type { CreateEscritorioAdminDto } from './dto/create-escritorio-admin.dto';
import type { UpdateEscritorioAdminDto } from './dto/update-escritorio-admin.dto';

@Injectable()
export class AdminEscritoriosService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar() {
    return this.drizzle.db
      .select()
      .from(escritorio)
      .orderBy(desc(escritorio.createdAt));
  }

  async obter(id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(escritorio)
      .where(eq(escritorio.id, id))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Escritório não encontrado');
    }
    return row;
  }

  async criar(dto: CreateEscritorioAdminDto) {
    const [row] = await this.drizzle.db
      .insert(escritorio)
      .values({
        nome: dto.nome.trim(),
        cnpj: dto.cnpj?.trim() || null,
      })
      .returning();
    return row;
  }

  async atualizar(id: string, dto: UpdateEscritorioAdminDto) {
    await this.obter(id);
    const patch: Partial<typeof escritorio.$inferInsert> = {};
    if (dto.nome !== undefined) {
      patch.nome = dto.nome.trim();
    }
    if (dto.ativo !== undefined) {
      patch.ativo = dto.ativo;
    }
    if (!Object.keys(patch).length) {
      return this.obter(id);
    }
    await this.drizzle.db
      .update(escritorio)
      .set(patch)
      .where(eq(escritorio.id, id));
    return this.obter(id);
  }

  /** Desativa o tenant (soft delete). */
  async desativar(id: string) {
    await this.obter(id);
    await this.drizzle.db
      .update(escritorio)
      .set({ ativo: false })
      .where(eq(escritorio.id, id));
    return this.obter(id);
  }
}
