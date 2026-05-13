import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// Sentry (futuro): import { APP_FILTER } from '@nestjs/core';
// import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AudienciasModule } from './audiencias/audiencias.module';
import { AuthModule } from './auth/auth.module';
import { ComarcasModule } from './comarcas/comarcas.module';
import { ComunicacoesModule } from './comunicacoes/comunicacoes.module';
import { EscritorioConfigApiModule } from './config/config.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DrizzleModule } from './db/drizzle.module';
import { EscritorioModule } from './escritorio/escritorio.module';
import { EscritoriosAdversariosModule } from './escritorios-adversarios/escritorios-adversarios.module';
import { ImprocedentesModule } from './improcedentes/improcedentes.module';
import { HealthController } from './health.controller';
import { ImportacaoModule } from './importacao/importacao.module';
import { MailModule } from './mail/mail.module';
import { PendenciasModule } from './pendencias/pendencias.module';
import { ProcessosModule } from './processos/processos.module';
import { ProcedentesModule } from './procedentes/procedentes.module';
import { ReusModule } from './reus/reus.module';
import { SentencasModule } from './sentencas/sentencas.module';
import { StorageModule } from './storage/storage.module';
import { TenantInterceptor } from './tenant/tenant.interceptor';
import { UsuariosModule } from './usuarios/usuarios.module';
import { WorkersModule } from './workers/workers.module';

const redisUrl = process.env.REDIS_URL?.trim();

const bullRoot =
  redisUrl && redisUrl.length > 0
    ? [BullModule.forRoot({ connection: { url: redisUrl } })]
    : [];

/** Sem `PLATFORM_JWT_SECRET` a API sobe sem rotas `/admin/*` (dev não quebra). */
const adminImports = process.env.PLATFORM_JWT_SECRET?.trim()
  ? [AdminModule]
  : [];

@Module({
  imports: [
    // Sentry (futuro): SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    DrizzleModule,
    MailModule,
    StorageModule,
    AuditModule,
    ScheduleModule.forRoot(),
    ...bullRoot,
    WorkersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 40,
      },
    ]),
    AuthModule,
    ...adminImports,
    EscritorioModule,
    ProcessosModule,
    PendenciasModule,
    AudienciasModule,
    ComunicacoesModule,
    DashboardsModule,
    ImportacaoModule,
    EscritorioConfigApiModule,
    ProcedentesModule,
    UsuariosModule,
    ComarcasModule,
    ReusModule,
    SentencasModule,
    ImprocedentesModule,
    EscritoriosAdversariosModule,
  ],
  controllers: [HealthController],
  providers: [
    // Sentry (futuro): { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
