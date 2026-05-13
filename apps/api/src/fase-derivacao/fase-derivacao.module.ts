import { Module } from '@nestjs/common';
import { FaseDerivacaoService } from './fase-derivacao.service';

@Module({
  providers: [FaseDerivacaoService],
  exports: [FaseDerivacaoService],
})
export class FaseDerivacaoModule {}
