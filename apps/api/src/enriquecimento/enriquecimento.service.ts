import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { processo } from '../db/schema/processo';
import { ComunicaApiClient } from '../captura/comunica-api.client';
import type { EnriquecimentoJobPayload } from './enriquecimento.types';
import type { ComunicaApiItem } from '../comunicacoes/comunica-api.types';

const NOME_SUSPEITO =
  /REGISTRADO\(A\)\s+CIVILMENTE\s+COMO|^ESP[OÓ]LIO\s+DE|^MASSA\s+FALIDA|MENOR\s+REPRESENTADO/i;

function nomePareceLimpo(nome: string): boolean {
  if (!nome || nome !== nome.toUpperCase()) return false;
  if (NOME_SUSPEITO.test(nome)) return false;
  const palavras = nome.trim().split(/\s+/);
  if (palavras.length < 2 || palavras.length > 8) return false;
  return true;
}

function nomeEhSuspeito(nome: string): boolean {
  return nome === nome.toUpperCase() && NOME_SUSPEITO.test(nome);
}

function extrairMelhorNome(items: ComunicaApiItem[]): string | null {
  for (const item of items) {
    const dest = item.destinatarios?.find((d) => d.polo === 'A');
    if (dest?.nome && nomePareceLimpo(dest.nome.trim())) {
      return dest.nome.trim();
    }
  }
  for (const item of items) {
    const dest = item.destinatarios?.find((d) => d.polo === 'A');
    if (dest?.nome?.trim()) return dest.nome.trim();
  }
  for (const item of items) {
    if (item.destinatarios?.length === 1) {
      const nome = item.destinatarios[0].nome?.trim();
      if (nome) return nome;
    }
  }
  return null;
}

function extrairLogin(items: ComunicaApiItem[]): string | null {
  for (const item of items) {
    const adv = item.destinatarioadvogados?.[0]?.advogado;
    if (adv?.numero_oab && adv?.uf_oab) {
      return `${adv.numero_oab}/${adv.uf_oab}`.toUpperCase();
    }
  }
  return null;
}

@Injectable()
export class EnriquecimentoService {
  private readonly log = new Logger(EnriquecimentoService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly comunicaApi: ComunicaApiClient,
  ) {}

  async enriquecer(payload: EnriquecimentoJobPayload): Promise<void> {
    const { processoId, numeroProcesso, oab, ufOab } = payload;

    const numeroDigits = numeroProcesso.replace(/\D/g, '');
    if (!numeroDigits) {
      this.log.warn(`numeroProcesso inválido para processoId=${processoId}`);
      return;
    }

    const [proc] = await this.drizzle.db
      .select({
        clienteNome: processo.clienteNome,
        login: processo.login,
      })
      .from(processo)
      .where(eq(processo.id, processoId))
      .limit(1);

    if (!proc) return;

    const nomeAtualOk =
      proc.clienteNome?.trim() && nomePareceLimpo(proc.clienteNome.trim());
    const loginAtualOk = !!proc.login?.trim();

    if (nomeAtualOk && loginAtualOk) return;

    let items: ComunicaApiItem[] = [];
    try {
      items = await this.comunicaApi.consultarPorNumeroProcesso({
        numeroOab: oab,
        ufOab,
        numeroProcesso: numeroDigits,
      });
    } catch (err) {
      this.log.warn(`Falha ao consultar DJEN para processo ${numeroProcesso}: ${err}`);
      throw err;
    }

    if (!items.length) {
      this.log.debug(`Nenhuma comunicação retornada para ${numeroProcesso}`);
      return;
    }

    const patch: Partial<typeof processo.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (!nomeAtualOk) {
      const melhorNome = extrairMelhorNome(items);
      if (melhorNome) {
        patch.clienteNome = melhorNome.slice(0, 300);
        patch.requerConferencia = nomeEhSuspeito(melhorNome);
        if (patch.requerConferencia) {
          patch.observacaoGeral = `[ALERTA] Nome requer revisão manual: ${melhorNome.slice(0, 100)}`;
        }
      } else {
        patch.observacaoGeral = '[ALERTA] Nome do cliente não identificado automaticamente.';
      }
    }

    if (!loginAtualOk) {
      const login = extrairLogin(items);
      if (login) patch.login = login;
    }

    const temMudanca = Object.keys(patch).length > 1;
    if (!temMudanca) return;

    await this.drizzle.db
      .update(processo)
      .set(patch)
      .where(eq(processo.id, processoId));

    this.log.log(
      `Processo ${processoId} enriquecido: nome="${patch.clienteNome ?? 'sem mudança'}" login="${patch.login ?? 'sem mudança'}"`,
    );
  }
}
