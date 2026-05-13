import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { improcedente } from '../db/schema/improcedente';

@Injectable()
export class ImprocedentesService {
  constructor(private readonly drizzle: DrizzleService) {}

  listar(escritorioId: string, limit = 500) {
    return this.drizzle.db
      .select()
      .from(improcedente)
      .where(eq(improcedente.escritorioId, escritorioId))
      .orderBy(desc(improcedente.createdAt))
      .limit(limit);
  }
}
