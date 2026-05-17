import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  escritorioAdversario,
  escritorioAdversarioAlias,
} from '../db/schema/escritorio-adversario';
import type { CreateEscritorioAdversarioDto } from './dto/create-escritorio-adversario.dto';
import type { UpdateEscritorioAdversarioDto } from './dto/update-escritorio-adversario.dto';

function norm(s: string): string {
  return s.trim().toUpperCase();
}

@Injectable()
export class EscritoriosAdversariosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listarComAliases(escritorioId: string, limit = 500) {
    const rows = await this.drizzle.db
      .select()
      .from(escritorioAdversario)
      .where(eq(escritorioAdversario.escritorioId, escritorioId))
      .orderBy(desc(escritorioAdversario.createdAt))
      .limit(limit);

    const ids = rows.map((r) => r.id);
    if (!ids.length) {
      return [];
    }

    const ali = await this.drizzle.db
      .select()
      .from(escritorioAdversarioAlias)
      .where(inArray(escritorioAdversarioAlias.escritorioAdversarioId, ids));

    const byId = new Map<string, string[]>();
    for (const a of ali) {
      const list = byId.get(a.escritorioAdversarioId) ?? [];
      list.push(a.alias);
      byId.set(a.escritorioAdversarioId, list);
    }

    return rows.map((r) => ({
      ...r,
      aliases: byId.get(r.id) ?? [],
    }));
  }

  listar(escritorioId: string, limit = 500) {
    return this.listarComAliases(escritorioId, limit);
  }

  async criar(escritorioId: string, dto: CreateEscritorioAdversarioDto) {
    const nome = dto.nomeCanonico.trim().toUpperCase();
    try {
      const [row] = await this.drizzle.db
        .insert(escritorioAdversario)
        .values({
          escritorioId,
          nomeCanonico: nome,
          cnpj: dto.cnpj?.trim() || null,
        })
        .returning();
      const aliasList = [
        nome,
        ...(dto.aliases ?? []).map((a) => norm(a)).filter(Boolean),
      ];
      const uniq = [...new Set(aliasList)];
      for (const alias of uniq) {
        await this.drizzle.db
          .insert(escritorioAdversarioAlias)
          .values({ escritorioAdversarioId: row!.id, alias })
          .onConflictDoNothing();
      }
      const lista = await this.listarComAliases(escritorioId);
      return lista.find((r) => r.id === row!.id) ?? { ...row!, aliases: [nome] };
    } catch {
      throw new ConflictException(
        'Já existe banca adversa com este nome canônico neste escritório.',
      );
    }
  }

  private async obterDoEscritorio(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(escritorioAdversario)
      .where(
        and(
          eq(escritorioAdversario.escritorioId, escritorioId),
          eq(escritorioAdversario.id, id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException('Escritório adversário não encontrado');
    }
    return row;
  }

  async atualizar(
    escritorioId: string,
    id: string,
    dto: UpdateEscritorioAdversarioDto,
  ) {
    await this.obterDoEscritorio(escritorioId, id);
    const patch: Partial<typeof escritorioAdversario.$inferInsert> = {};
    if (dto.nomeCanonico !== undefined) {
      patch.nomeCanonico = norm(dto.nomeCanonico);
    }
    if (dto.cnpj !== undefined) {
      patch.cnpj = dto.cnpj?.trim() || null;
    }
    if (Object.keys(patch).length) {
      try {
        await this.drizzle.db
          .update(escritorioAdversario)
          .set(patch)
          .where(
            and(
              eq(escritorioAdversario.escritorioId, escritorioId),
              eq(escritorioAdversario.id, id),
            ),
          );
      } catch {
        throw new ConflictException('Nome canônico já existe neste escritório.');
      }
    }
    if (dto.aliases !== undefined) {
      await this.drizzle.db
        .delete(escritorioAdversarioAlias)
        .where(eq(escritorioAdversarioAlias.escritorioAdversarioId, id));
      const uniq = [...new Set(dto.aliases.map(norm).filter(Boolean))];
      for (const alias of uniq) {
        await this.drizzle.db
          .insert(escritorioAdversarioAlias)
          .values({ escritorioAdversarioId: id, alias })
          .onConflictDoNothing();
      }
    }
    const lista = await this.listarComAliases(escritorioId);
    return lista.find((r) => r.id === id);
  }

  async remover(escritorioId: string, id: string) {
    await this.obterDoEscritorio(escritorioId, id);
    await this.drizzle.db
      .delete(escritorioAdversarioAlias)
      .where(eq(escritorioAdversarioAlias.escritorioAdversarioId, id));
    await this.drizzle.db
      .delete(escritorioAdversario)
      .where(
        and(
          eq(escritorioAdversario.escritorioId, escritorioId),
          eq(escritorioAdversario.id, id),
        ),
      );
    return { ok: true };
  }
}
