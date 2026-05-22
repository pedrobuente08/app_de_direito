import { Module } from '@nestjs/common';
import { EncadeamentosModule } from '../encadeamentos/encadeamentos.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [EncadeamentosModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
