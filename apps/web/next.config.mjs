import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

/**
 * Só define `outputFileTracingRoot` quando a raiz do monorepo existe (build local `npm run build -w web`).
 * No Docker (contexto só `apps/workdir` = `/app`), `../../package-lock.json` não existe — evita
 * apontar o trace para `/` e gerar standalone sem `apps/web/server.js`.
 */
const monorepoRoot = path.join(__dirname, '..', '..');
const isMonorepoCheckout = fs.existsSync(path.join(monorepoRoot, 'package-lock.json'));

const nextConfig = {
  /** Imagem Docker menor + deploy Coolify/VPS. */
  output: 'standalone',
  ...(isMonorepoCheckout
    ? {
        experimental: {
          outputFileTracingRoot: monorepoRoot,
        },
      }
    : {}),

  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
