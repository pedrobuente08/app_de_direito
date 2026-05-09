import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import type { UpdateEscritorioConfigDto } from './dto/update-escritorio-config.dto';

@Injectable()
export class EscritorioService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getSkillConfigJson(escritorioId: string): Promise<Record<string, unknown>> {
    const [row] = await this.drizzle.db
      .select({ config: escritorio.config })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Escritório não encontrado');
    }

    const c = (row.config ?? {}) as EscritorioConfig;
    return {
      mapa_comarcas: c.mapa_comarcas ?? {},
      login_map: c.login_map ?? {},
      materias_validas: c.materias_validas ?? [],
      fase_inicial: c.fase_inicial ?? 'AUDIÊNCIA AGENDADA',
      situacao_inicial: c.situacao_inicial ?? 'ATIVO',
    };
  }

  async obterPerfilTenant(escritorioId: string) {
    const [row] = await this.drizzle.db
      .select({
        id: escritorio.id,
        nome: escritorio.nome,
        cnpj: escritorio.cnpj,
        config: escritorio.config,
        ativo: escritorio.ativo,
        createdAt: escritorio.createdAt,
      })
      .from(escritorio)
      .where(eq(escritorio.id, escritorioId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Escritório não encontrado');
    }
    return row;
  }

  async atualizarConfig(
    escritorioId: string,
    dto: UpdateEscritorioConfigDto,
  ): Promise<EscritorioConfig> {
    const current = await this.obterPerfilTenant(escritorioId);
    const prev = (current.config ?? {}) as EscritorioConfig;

    const merged: EscritorioConfig = {
      ...prev,
      ...(dto.mapa_comarcas !== undefined
        ? { mapa_comarcas: dto.mapa_comarcas }
        : {}),
      ...(dto.login_map !== undefined ? { login_map: dto.login_map } : {}),
      ...(dto.materias_validas !== undefined
        ? { materias_validas: dto.materias_validas }
        : {}),
      ...(dto.fase_inicial !== undefined ? { fase_inicial: dto.fase_inicial } : {}),
      ...(dto.situacao_inicial !== undefined
        ? { situacao_inicial: dto.situacao_inicial }
        : {}),
      ...(dto.dropdowns_processo !== undefined
        ? {
            dropdowns_processo: {
              ...(prev.dropdowns_processo ?? {}),
              ...dto.dropdowns_processo,
            },
          }
        : {}),
    };

    if (
      dto.comunica_webhook_token === null ||
      dto.comunica_webhook_token === ''
    ) {
      delete merged.comunica_webhook_token;
    } else if (dto.comunica_webhook_token !== undefined) {
      merged.comunica_webhook_token = dto.comunica_webhook_token.trim();
    }

    if (dto.comunica_regras !== undefined) {
      merged.comunica_regras = dto.comunica_regras;
    }
    if (dto.comunica_digest !== undefined) {
      merged.comunica_digest = dto.comunica_digest as EscritorioConfig['comunica_digest'];
    }

    await this.drizzle.db
      .update(escritorio)
      .set({ config: merged })
      .where(eq(escritorio.id, escritorioId));

    return merged;
  }
}
