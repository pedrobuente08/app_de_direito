import { SetMetadata } from '@nestjs/common';
import type { AddonKey } from './addons.types';

export const ADDON_KEY = 'addon';

export const RequireAddon = (addon: AddonKey) => SetMetadata(ADDON_KEY, addon);
