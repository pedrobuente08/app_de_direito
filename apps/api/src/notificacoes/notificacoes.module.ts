import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [MailModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
