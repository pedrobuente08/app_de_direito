import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  advogadoAdversario,
  advogadoAdversarioAlias,
} from '../db/schema/advogado-adversario';
import type { CreateAdvogadoAdversarioDto } from './dto/create-advogado-adversario.dto';
import type { UpdateAdvogadoAdversarioDto } from './dto/update-advogado-adversario.dto';

function norm(s: string): string {
  return s.trim().toUpperCase();
}

@Injectable()
export class AdvogadosAdversariosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string, limit = 500) {
    const rows = await this.drizzle.db
      .select()
      .from(advogadoAdversario)
      .where(eq(advogadoAdversario.escritorioId, escritorioId))
      .orderBy(desc(advogadoAdversario.createdAt))
      .limit(limit);

    const ids = rows.map((r) => r.id);
    if (!ids.length) {
      return [];
    }

    const ali = await this.drizzle.db
      .select()
      .from(advogadoAdversarioAlias)
      .where(inArray(advogadoAdversarioAlias.advogadoAdversarioId, ids));

    const byId = new Map<string, string[]>();
    for (const a of ali) {
      const list = byId.get(a.advogadoAdversarioId) ?? [];
      list.push(a.alias);
      byId.set(a.advogadoAdversarioId, list);
    }

    return rows.map((r) => ({
      ...r,
      aliases: byId.get(r.id) ?? [],
    }));
  }

  async criar(escritorioId: string, dto: CreateAdvogadoAdversarioDto) {
    const nome = norm(dto.nomeCanonico);
    try {
      const [row] = await this.drizzle.db
        .insert(advogadoAdversario)
        .values({
          escritorioId,
          nomeCanonico: nome,
          oab: dto.oab?.trim() || null,
          escritorioAdversarioId: dto.escritorioAdversarioId ?? null,
        })
        .returning();

      const aliasList = [
        nome,
        ...(dto.aliases ?? []).map(norm).filter(Boolean),
      ];
      const uniq = [...new Set(aliasList)];
      for (const alias of uniq) {
        await this.drizzle.db
          .insert(advogadoAdversarioAlias)
          .values({ advogadoAdversarioId: row!.id, alias })
          .onConflictDoNothing();
      }

      const lista = await this.listar(escritorioId);
      return lista.find((r) => r.id === row!.id) ?? { ...row!, aliases: [nome] };
    } catch {
      throw new ConflictException(
        'Já existe advogado adversário com este nome canônico.',
      );
    }
  }

  private async obter(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(advogadoAdversario)
      .where(
        and(
          eq(advogadoAdversario.escritorioId, escritorioId),
          eq(advogadoAdversario.id, id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Advogado adversário não encontrado');
    }
    return row;
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateAdvogadoAdversarioDto,
  ) {
    await this.obter(escritorioId, id);
    const patch: Partial<typeof advogadoAdversario.$inferInsert> = {};
    if (dto.nomeCanonico !== undefined) {
      patch.nomeCanonico = norm(dto.nomeCanonico);
    }
    if (dto.oab !== undefined) {
      patch.oab = dto.oab?.trim() || null;
    }
    if (dto.escritorioAdversarioId !== undefined) {
      patch.escritorioAdversarioId = dto.escritorioAdversarioId;
    }
    if (Object.keys(patch).length) {
      try {
        await this.drizzle.db
          .update(advogadoAdversario)
          .set(patch)
          .where(
            and(
              eq(advogadoAdversario.escritorioId, escritorioId),
              eq(advogadoAdversario.id, id),
            ),
          );
      } catch {
        throw new ConflictException('Nome canônico já existe neste escritório.');
      }
    }
    if (dto.aliases !== undefined) {
      await this.drizzle.db
        .delete(advogadoAdversarioAlias)
        .where(eq(advogadoAdversarioAlias.advogadoAdversarioId, id));
      const uniq = [...new Set(dto.aliases.map(norm).filter(Boolean))];
      for (const alias of uniq) {
        await this.drizzle.db
          .insert(advogadoAdversarioAlias)
          .values({ advogadoAdversarioId: id, alias });
      }
    }
    const lista = await this.listar(escritorioId);
    return lista.find((r) => r.id === id);
  }

  async remover(escritorioId: string, id: string) {
    await this.obter(escritorioId, id);
    await this.drizzle.db
      .delete(advogadoAdversarioAlias)
      .where(eq(advogadoAdversarioAlias.advogadoAdversarioId, id));
    await this.drizzle.db
      .delete(advogadoAdversario)
      .where(
        and(
          eq(advogadoAdversario.escritorioId, escritorioId),
          eq(advogadoAdversario.id, id),
        ),
      );
    return { ok: true };
  }
}
