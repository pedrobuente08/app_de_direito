import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

export type SkillExtractResult = {
  processo: Record<string, unknown> | null;
  confidence: number;
  campos_extraidos?: string[];
  campos_vazios?: string[];
  alerta?: string | null;
  erro?: string;
  arquivo?: string;
  sistema_detectado?: string;
};

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  async extract(
    buffer: Buffer,
    filename: string,
    config: Record<string, unknown>,
  ): Promise<SkillExtractResult> {
    const rawBase = process.env.SKILL_URL?.trim();
    const base = rawBase?.replace(/\/$/, '');
    if (!base) {
      throw new ServiceUnavailableException(
        'SKILL_URL não configurada — o microserviço Python de extração não pode ser chamado.',
      );
    }

    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: 'application/pdf',
    });
    form.append('config_json', JSON.stringify(config));

    const headers: Record<string, string> = {
      ...form.getHeaders(),
    };
    const key = process.env.SKILL_API_KEY?.trim();
    if (key) {
      headers['X-Skill-Key'] = key;
    }

    try {
      const { status, data } = await axios.post<
        SkillExtractResult | { detail?: unknown }
      >(`${base}/extract`, form, {
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120_000,
        validateStatus: () => true,
      });

      if (status >= 200 && status < 300) {
        return data as SkillExtractResult;
      }

      const detailStr =
        typeof (data as { detail?: unknown })?.detail === 'string'
          ? String((data as { detail: string }).detail)
          : JSON.stringify(data ?? {});

      this.logger.warn(`Skill HTTP ${status}: ${detailStr}`);

      if (status === 401 || status === 403) {
        throw new UnauthorizedException(
          detailStr || 'Chave da skill inválida (SKILL_API_KEY).',
        );
      }
      if (status === 400 || status === 422) {
        throw new BadRequestException(
          detailStr || 'PDF ou configuração rejeitados pela skill.',
        );
      }

      throw new ServiceUnavailableException(
        `Skill retornou erro HTTP ${status}. Confira se o serviço está estável.`,
      );
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data;
        this.logger.warn(`Skill rede HTTP ${status}: ${JSON.stringify(detail)}`);
      } else {
        this.logger.warn(`Skill erro: ${String(err)}`);
      }
      throw new ServiceUnavailableException(
        'Não foi possível contatar o serviço de extração (skill). Confira SKILL_URL e se o Python está rodando.',
      );
    }
  }
}
