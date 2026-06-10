import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ComunicaApiItem, ComunicaApiResponse } from '../comunicacoes/comunica-api.types';

export type ConsultaOabParams = {
  numeroOab: string;
  ufOab: string;
  dataInicio: string;
  dataFim: string;
  pagina: number;
  itensPorPagina?: number;
};

export type ConsultaProcessoParams = {
  numeroOab: string;
  ufOab: string;
  numeroProcesso: string;
};

@Injectable()
export class ComunicaApiClient {
  private readonly log = new Logger(ComunicaApiClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      config.get<string>('COMUNICA_API_BASE_URL')?.trim() ||
      'https://comunicaapi.pje.jus.br/api/v1';
    this.timeoutMs = Number(config.get('COMUNICA_API_TIMEOUT_MS') ?? 30_000);
  }

  async consultarPorOab(params: ConsultaOabParams): Promise<ComunicaApiResponse> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/comunicacao`);
    url.searchParams.set('pagina', String(params.pagina));
    url.searchParams.set('itensPorPagina', String(params.itensPorPagina ?? 100));
    url.searchParams.set('numeroOab', params.numeroOab);
    url.searchParams.set('ufOab', params.ufOab);
    url.searchParams.set('dataDisponibilizacaoInicio', params.dataInicio);
    url.searchParams.set('dataDisponibilizacaoFim', params.dataFim);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Comunica API HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as ComunicaApiResponse;
      if (data.status !== 'success') {
        throw new Error(data.message || 'Resposta inesperada da API Comunica');
      }
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Comunica API timeout após ${this.timeoutMs}ms`);
      }
      this.log.warn(`Falha na consulta OAB ${params.ufOab}${params.numeroOab}: ${err}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Busca todas as páginas até esgotar ou atingir limite de segurança. */
  async consultarPorOabTodasPaginas(
    params: Omit<ConsultaOabParams, 'pagina'>,
    maxPaginas = 20,
  ): Promise<ComunicaApiItem[]> {
    const items: ComunicaApiItem[] = [];
    let pagina = 1;

    while (pagina <= maxPaginas) {
      const page = await this.consultarPorOab({ ...params, pagina });
      if (!page.items?.length) break;
      items.push(...page.items);
      if (page.items.length < (params.itensPorPagina ?? 100)) break;
      pagina += 1;
    }

    return items;
  }

  async consultarPorNumeroProcesso(
    params: ConsultaProcessoParams,
    maxPaginas = 5,
  ): Promise<ComunicaApiItem[]> {
    const items: ComunicaApiItem[] = [];

    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/comunicacao`);
      url.searchParams.set('pagina', String(pagina));
      url.searchParams.set('itensPorPagina', '100');
      url.searchParams.set('numeroOab', params.numeroOab);
      url.searchParams.set('ufOab', params.ufOab);
      url.searchParams.set('numeroProcesso', params.numeroProcesso);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) break;
        const data = (await res.json()) as ComunicaApiResponse;
        if (data.status !== 'success' || !data.items?.length) break;
        items.push(...data.items);
        if (data.items.length < 100) break;
      } catch {
        break;
      } finally {
        clearTimeout(timer);
      }
    }

    return items;
  }
}
