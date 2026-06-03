import { ForbiddenException, Injectable } from '@nestjs/common';
import type { EscritorioAddonsConfig } from '../db/schema/escritorio';
import { EscritorioService } from '../escritorio/escritorio.service';
import type { AddonKey } from './addons.types';

@Injectable()
export class AddonsService {
  constructor(private readonly escritorio: EscritorioService) {}

  async getAddons(escritorioId: string): Promise<EscritorioAddonsConfig> {
    const row = await this.escritorio.obterPerfilTenant(escritorioId);
    const cfg = (row.config ?? {}) as { addons?: EscritorioAddonsConfig };
    return cfg.addons ?? {};
  }

  async isEnabled(escritorioId: string, key: AddonKey): Promise<boolean> {
    const addons = await this.getAddons(escritorioId);
    return addons[key] === true;
  }

  async assertEnabled(escritorioId: string, key: AddonKey): Promise<void> {
    if (!(await this.isEnabled(escritorioId, key))) {
      throw new ForbiddenException(
        `Add-on PRO "${key}" não está ativo para este escritório.`,
      );
    }
  }
}
