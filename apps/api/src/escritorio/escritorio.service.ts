import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { comarca } from '../db/schema/comarca';
import type { EscritorioConfig } from '../db/schema/escritorio';
import { escritorio } from '../db/schema/escritorio';
import { usuario } from '../db/schema/usuario';
import type { UpdateEscritorioConfigDto } from './dto/update-escritorio-config.dto';

@Injectable()
export class EscritorioService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Monta o JSON enviado à skill: comarcas e logins vêm das tabelas;
   * demais chaves continuam em `escritorio.config`.
   */
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

    const comarcas = await this.drizzle.db
      .select({
        codigo: comarca.codigo,
        abreviado: comarca.abreviado,
      })
      .from(comarca)
      .where(eq(comarca.escritorioId, escritorioId));

    const mapa_comarcas: Record<string, string> = {};
    for (const cm of comarcas) {
      const cod = cm.codigo?.trim();
      if (!cod) {
        continue;
      }
      mapa_comarcas[cod] = (cm.abreviado ?? '').trim();
    }

    const usuariosRows = await this.drizzle.db
      .select({
        nome: usuario.nome,
        loginAliases: usuario.loginAliases,
      })
      .from(usuario)
      .where(eq(usuario.escritorioId, escritorioId));

    const login_map: Record<string, string> = {};
    for (const u of usuariosRows) {
      const canonical = u.nome?.trim();
      if (!canonical) {
        continue;
      }
      login_map[canonical.toUpperCase()] = canonical;
      for (const raw of u.loginAliases ?? []) {
        const a = raw?.trim().toUpperCase();
        if (a) {
          login_map[a] = canonical;
        }
      }
    }

    return {
      mapa_comarcas,
      login_map,
      materias_validas: c.materias_validas ?? [],
      fase_inicial: c.fase_inicial ?? 'AUDIÊNCIA AGENDADA',
      situacao_inicial: c.situacao_inicial ?? 'ATIVO',
      status_processo_inicial:
        c.status_processo_inicial ?? c.situacao_inicial ?? 'ATIVO',
    };
  }

  /** Reservado para invalidar cache Redis da config da skill, quando existir. */
  invalidarCacheSkill(_escritorioId: string): void {
    void _escritorioId;
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
    const rawPrev = (current.config ?? {}) as Record<string, unknown>;
    const { mapa_comarcas: _mc, login_map: _lm, ...prevRest } = rawPrev;
    const prev = prevRest as EscritorioConfig;

    const merged: EscritorioConfig = {
      ...prev,
      ...(dto.materias_validas !== undefined
        ? { materias_validas: dto.materias_validas }
        : {}),
      ...(dto.fase_inicial !== undefined ? { fase_inicial: dto.fase_inicial } : {}),
      ...(dto.situacao_inicial !== undefined
        ? { situacao_inicial: dto.situacao_inicial }
        : {}),
      ...(dto.status_processo_inicial !== undefined
        ? { status_processo_inicial: dto.status_processo_inicial }
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
    if (dto.transicoes_fase !== undefined) {
      merged.transicoes_fase = dto.transicoes_fase;
    }
    if (dto.prazo_avaliacao_recurso_dias !== undefined) {
      merged.prazo_avaliacao_recurso_dias = dto.prazo_avaliacao_recurso_dias;
    }
    if (dto.prazo_elaborar_recurso_dias !== undefined) {
      merged.prazo_elaborar_recurso_dias = dto.prazo_elaborar_recurso_dias;
    }
    if (dto.tipos_pendencia !== undefined) {
      merged.tipos_pendencia = dto.tipos_pendencia;
    }
    if (dto.fatores_provisao_pct !== undefined) {
      merged.fatores_provisao_pct = dto.fatores_provisao_pct;
    }

    await this.drizzle.db
      .update(escritorio)
      .set({ config: merged })
      .where(eq(escritorio.id, escritorioId));

    return merged;
  }
}
