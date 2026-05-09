/**
 * Carrega `apps/api/.env` pelo caminho do arquivo compilado (`dist/` → pasta da API),
 * independentemente do `cwd` ao rodar `npm run dev:api` na raiz do monorepo.
 */
import { config } from 'dotenv';
import { join } from 'path';

const envPath = join(__dirname, '..', '.env');
config({ path: envPath });
