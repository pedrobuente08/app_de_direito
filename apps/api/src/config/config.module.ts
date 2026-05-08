import { Module } from '@nestjs/common';
import { EscritorioModule } from '../escritorio/escritorio.module';
import { ConfigController } from './config.controller';

/** Rotas `GET/PATCH /api/config` — nome distinto do `ConfigModule` do `@nestjs/config`. */
@Module({
  imports: [EscritorioModule],
  controllers: [ConfigController],
})
export class EscritorioConfigApiModule {}
