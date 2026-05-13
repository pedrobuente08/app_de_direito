import { ConflictException, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import {
  escritorioAdversario,
  escritorioAdversarioAlias,
} from '../db/schema/escritorio-adversario';
import type { CreateEscritorioAdversarioDto } from './dto/create-escritorio-adversario.dto';

@Injectable()
export class EscritoriosAdversariosService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select()
      .from(escritorioAdversario)
      .where(eq(escritorioAdversario.escritorioId, escritorioId))
      .orderBy(desc(escritorioAdversario.createdAt))
      .limit(limit);
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
      await this.drizzle.db.insert(escritorioAdversarioAlias).values({
        escritorioAdversarioId: row!.id,
        alias: nome,
      });
      return row;
    } catch {
      throw new ConflictException(
        'Já existe banca adversa com este nome canônico neste escritório.',
      );
    }
  }
}
