/**
 * Sentry — desativado por padrão. Para ativar no futuro:
 *
 * 1. Descomente o import em `main.ts`: `import './instrument';` (primeira linha).
 * 2. Descomente `SentryModule` e `SentryGlobalFilter` em `app.module.ts`.
 * 3. Defina `SENTRY_DSN` no `.env` (veja `.env.example`).
 * 4. `npm install` já inclui `@sentry/nestjs` se o pacote estiver no projeto.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */

// import { config } from 'dotenv';
// import * as Sentry from '@sentry/nestjs';
//
// config();
//
// const dsn = process.env.SENTRY_DSN?.trim();
// if (dsn) {
//   Sentry.init({
//     dsn,
//     environment:
//       process.env.SENTRY_ENVIRONMENT?.trim() ||
//       process.env.NODE_ENV ||
//       'development',
//     tracesSampleRate: Math.min(
//       1,
//       Math.max(
//         0,
//         Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
//       ),
//     ),
//     sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',
//   });
// }
