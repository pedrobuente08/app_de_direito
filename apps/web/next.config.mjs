import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

const nextConfig = {
  /** Imagem Docker menor + deploy Coolify/VPS. */
  output: 'standalone',
  /** Monorepo: rastrear dependências a partir da raiz do repo (`app_de_direito/`). */
  outputFileTracingRoot: path.join(__dirname, '../..'),

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
