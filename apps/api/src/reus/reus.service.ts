import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { reu } from '../db/schema/reu';
import { reuAlias } from '../db/schema/reu-alias';
import type { AddAliasesDto } from './dto/add-aliases.dto';
import type { CreateReuDto } from './dto/create-reu.dto';
import type { MergeReuDto } from './dto/merge-reu.dto';
import type { UpdateReuDto } from './dto/update-reu.dto';

function norm(s: string): string {
  return s.trim().toUpperCase();
}

@Injectable()
export class ReusService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listar(escritorioId: string) {
    const rows = await this.drizzle.db
      .select()
      .from(reu)
      .where(eq(reu.escritorioId, escritorioId));

    const ids = rows.map((r) => r.id);
    if (!ids.length) {
      return [];
    }

    const ali = await this.drizzle.db
      .select()
      .from(reuAlias)
      .where(inArray(reuAlias.reuId, ids));

    const byReu = new Map<string, string[]>();
    for (const a of ali) {
      const list = byReu.get(a.reuId) ?? [];
      list.push(a.alias);
      byReu.set(a.reuId, list);
    }

    return rows.map((r) => ({
      ...r,
      aliases: byReu.get(r.id) ?? [],
    }));
  }

  private async inserirAliases(reuId: string, aliases: string[]) {
    const uniq = [...new Set(aliases.map(norm).filter(Boolean))];
    if (!uniq.length) {
      return;
    }
    for (const alias of uniq) {
      try {
        await this.drizzle.db
          .insert(reuAlias)
          .values({ reuId, alias })
          .onConflictDoNothing();
      } catch {
        /* ignore */
      }
    }
  }

  async criar(escritorioId: string, dto: CreateReuDto) {
    const nomeCanonico = norm(dto.nomeCanonico);

    try {
      const [row] = await this.drizzle.db
        .insert(reu)
        .values({
          escritorioId,
          nomeCanonico,
          cnpj: dto.cnpj?.trim() || null,
        })
        .returning();

      if (!row) {
        throw new ConflictException('Falha ao criar réu');
      }
      if (dto.aliases?.length) {
        await this.inserirAliases(row.id, dto.aliases);
      }
      const lista = await this.listar(escritorioId);
      return lista.find((r) => r.id === row.id) ?? { ...row, aliases: [] };
    } catch (e) {
      if (e instanceof ConflictException) {
        throw e;
      }
      throw new ConflictException(
        'Réu duplicado neste escritório (nome canônico único).',
      );
    }
  }

  private async obterDoEscritorio(escritorioId: string, id: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(reu)
      .where(and(eq(reu.escritorioId, escritorioId), eq(reu.id, id)))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Réu não encontrado');
    }
    return row;
  }

  async atualizar(escritorioId: string, id: string, dto: UpdateReuDto) {
    await this.obterDoEscritorio(escritorioId, id);

    if (dto.nomeCanonico !== undefined || dto.cnpj !== undefined) {
      const patch: Partial<typeof reu.$inferInsert> = {};
      if (dto.nomeCanonico !== undefined) {
        patch.nomeCanonico = norm(dto.nomeCanonico);
      }
      if (dto.cnpj !== undefined) {
        patch.cnpj = dto.cnpj?.trim() || null;
      }
      try {
        await this.drizzle.db
          .update(reu)
          .set(patch)
          .where(and(eq(reu.escritorioId, escritorioId), eq(reu.id, id)));
      } catch {
        throw new ConflictException('Nome canônico já existe neste escritório.');
      }
    }

    if (dto.aliases !== undefined) {
      await this.drizzle.db.delete(reuAlias).where(eq(reuAlias.reuId, id));
      await this.inserirAliases(id, dto.aliases);
    }

    const lista = await this.listar(escritorioId);
    return lista.find((r) => r.id === id);
  }

  async remover(escritorioId: string, id: string) {
    await this.obterDoEscritorio(escritorioId, id);
    const [cnt] = await this.drizzle.db
      .select({ n: count() })
      .from(processo)
      .where(eq(processo.reuId, id));

    if ((cnt?.n ?? 0) > 0) {
      throw new ConflictException(
        'Não é possível excluir: existem processos vinculados a este réu.',
      );
    }

    await this.drizzle.db.delete(reuAlias).where(eq(reuAlias.reuId, id));
    await this.drizzle.db
      .delete(reu)
      .where(and(eq(reu.escritorioId, escritorioId), eq(reu.id, id)));
    return { ok: true };
  }

  async addAliases(escritorioId: string, id: string, dto: AddAliasesDto) {
    await this.obterDoEscritorio(escritorioId, id);
    await this.inserirAliases(id, dto.aliases);
    const lista = await this.listar(escritorioId);
    return lista.find((r) => r.id === id);
  }

  async sugerirMerge(escritorioId: string, texto: string) {
    const q = norm(texto);
    if (q.length < 2) {
      return [];
    }
    const lista = await this.listar(escritorioId);
    const out: { id: string; nomeCanonico: string; score: number }[] = [];
    for (const r of lista) {
      const aliases = r.aliases ?? [];
      const hay = [r.nomeCanonico, ...aliases].map((x) => norm(String(x)));
      const hit = hay.some((h) => h.includes(q) || q.includes(h));
      if (!hit) {
        continue;
      }
      const score = hay.some((h) => h === q)
        ? 1
        : hay.some((h) => h.includes(q))
          ? 0.75
          : 0.5;
      out.push({ id: r.id, nomeCanonico: r.nomeCanonico, score });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 25);
  }

  async merge(escritorioId: string, dto: MergeReuDto) {
    const destinoId = dto.destinoId;
    const origemIds = [...new Set(dto.origemIds)].filter((x) => x !== destinoId);
    if (!origemIds.length) {
      throw new BadRequestException('Informe ao menos um réu de origem distinto do destino.');
    }

    await this.obterDoEscritorio(escritorioId, destinoId);
    for (const oid of origemIds) {
      await this.obterDoEscritorio(escritorioId, oid);
    }

    await this.drizzle.db.transaction(async (tx) => {
      for (const oid of origemIds) {
        await tx
          .update(processo)
          .set({ reuId: destinoId })
          .where(
            and(eq(processo.escritorioId, escritorioId), eq(processo.reuId, oid)),
          );

        const aliases = await tx
          .select()
          .from(reuAlias)
          .where(eq(reuAlias.reuId, oid));

        for (const a of aliases) {
          try {
            await tx
              .insert(reuAlias)
              .values({ reuId: destinoId, alias: a.alias })
              .onConflictDoNothing();
          } catch {
            /* ignore */
          }
        }

        await tx.delete(reuAlias).where(eq(reuAlias.reuId, oid));
        await tx
          .delete(reu)
          .where(and(eq(reu.escritorioId, escritorioId), eq(reu.id, oid)));
      }
    });

    return this.listar(escritorioId);
  }

  async obterPorNome(escritorioId: string, nomeCanonico: string) {
    const upper = norm(nomeCanonico);
    const [row] = await this.drizzle.db
      .select()
      .from(reu)
      .where(
        and(eq(reu.escritorioId, escritorioId), eq(reu.nomeCanonico, upper)),
      )
      .limit(1);

    return row ?? null;
  }
}
