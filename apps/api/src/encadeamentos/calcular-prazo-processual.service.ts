import { Injectable } from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { feriado } from '../db/schema/feriado';

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseYmd(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

@Injectable()
export class CalcularPrazoProcessualService {
  constructor(private readonly drizzle: DrizzleService) {}

  async tipoPrazo(escritorioId: string): Promise<'DIAS_UTEIS' | 'CORRIDOS'> {
    const [row] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);
    const cfg = (row?.config ?? {}) as EscritorioConfig;
    return cfg.prazo_processual_tipo === 'CORRIDOS' ? 'CORRIDOS' : 'DIAS_UTEIS';
  }

  async calcular(
    escritorioId: string,
    dias: number,
    baseYmd?: string,
  ): Promise<string> {
    const base = baseYmd ?? ymd(new Date());
    if (dias <= 0) return base;

    const tipo = await this.tipoPrazo(escritorioId);
    if (tipo === 'CORRIDOS') {
      const d = parseYmd(base);
      d.setDate(d.getDate() + dias);
      return ymd(d);
    }

    const feriados = await this.carregarFeriados(escritorioId, base, dias + 60);
    let restantes = dias;
    let cursor = parseYmd(base);
    while (restantes > 0) {
      cursor.setDate(cursor.getDate() + 1);
      const dow = cursor.getDay();
      const iso = ymd(cursor);
      if (dow === 0 || dow === 6 || feriados.has(iso)) continue;
      restantes -= 1;
    }
    return ymd(cursor);
  }

  private async carregarFeriados(
    escritorioId: string,
    desde: string,
    janelaDias: number,
  ): Promise<Set<string>> {
    const fim = parseYmd(desde);
    fim.setDate(fim.getDate() + janelaDias);
    const rows = await this.drizzle.db
      .select({ data: feriado.data })
      .from(feriado)
      .where(
        and(
          eq(feriado.escritorioId, escritorioId),
          gte(feriado.data, desde),
          lte(feriado.data, ymd(fim)),
        ),
      );
    return new Set(rows.map((r) => r.data));
  }
}
