import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

/**
 * Monorepo (`npm run build -w web`): rastrear a partir da raiz do repo.
 * Build só em `apps/web` (Docker): **não** definir `outputFileTracingRoot` — se apontar só para
 * `apps/web`, o bundle standalone pode sair sem `node_modules` (server quebra no container).
 */
const isDockerWebOnly = process.env.DOCKER_WEB_STANDALONE === '1';

const nextConfig = {
  /** Imagem Docker menor + deploy Coolify/VPS. */
  output: 'standalone',
  ...(!isDockerWebOnly
    ? {
        experimental: {
          outputFileTracingRoot: path.join(__dirname, '../..'),
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
