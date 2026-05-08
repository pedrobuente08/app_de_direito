import { defineConfig } from 'drizzle-kit';
import { normalizePostgresUrl } from './src/db/database-url';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: normalizePostgresUrl(process.env.DATABASE_URL!),
  },
  verbose: true,
  strict: true,
});
