import { Module } from '@nestjs/common';
import { VaraDocumentoRegrasController } from './vara-documento-regras.controller';
import { VaraDocumentoRegrasService } from './vara-documento-regras.service';

@Module({
  controllers: [VaraDocumentoRegrasController],
  providers: [VaraDocumentoRegrasService],
  exports: [VaraDocumentoRegrasService],
})
export class VaraDocumentoRegrasModule {}
