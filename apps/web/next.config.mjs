import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

/** Build Docker com contexto só em `apps/web` (Coolify “Base Directory” = web). */
const tracingRoot =
  process.env.DOCKER_WEB_STANDALONE === '1'
    ? __dirname
    : path.join(__dirname, '../..');

const nextConfig = {
  /** Imagem Docker menor + deploy Coolify/VPS. */
  output: 'standalone',
  /** Next 14.2: chave fica em `experimental` (evita aviso “Unrecognized key”). */
  experimental: {
    outputFileTracingRoot: tracingRoot,
  },

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
