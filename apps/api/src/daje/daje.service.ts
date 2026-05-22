import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { comarca } from '../db/schema/comarca';
import { processo } from '../db/schema/processo';
import { ProcessosService } from '../processos/processos.service';
import { ProcessosHipossuficienciaService } from '../processos/processos-hipossuficiencia.service';
import type { EmitirDajeDto } from './dto/emitir-daje.dto';
import type { ResultadoIsencaoDajeDto } from './dto/resultado-isencao-daje.dto';

function hojeYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class DajeService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
    private readonly hipossuf: ProcessosHipossuficienciaService,
  ) {}

  private async perfilDiligenciaVara(
    escritorioId: string,
    vara: string | null | undefined,
  ): Promise<'DILIGENTE' | 'MENOS_DILIGENTE'> {
    if (!vara?.trim()) return 'MENOS_DILIGENTE';
    const v = vara.trim();
    const [row] = await this.drizzle.db
      .select({ perfil: comarca.perfilDiligencia })
      .from(comarca)
      .where(
        and(
          eq(comarca.escritorioId, escritorioId),
          or(
            ilike(comarca.nome, `%${v}%`),
            ilike(comarca.abreviado, `%${v}%`),
            eq(comarca.codigo, v),
          ),
        ),
      )
      .limit(1);
    const p = (row?.perfil ?? '').toUpperCase();
    return p === 'DILIGENTE' ? 'DILIGENTE' : 'MENOS_DILIGENTE';
  }

  async emitir(escritorioId: string, processoId: string, dto: EmitirDajeDto) {
    await this.processos.obterPorId(escritorioId, processoId);
    const data = dto.dataEmissao?.slice(0, 10) ?? hojeYmd();
    const [row] = await this.drizzle.db
      .update(processo)
      .set({
        dajeEmitido: true,
        dajeStatus: 'EMITIDO',
        dajeValor: dto.valor,
        dajeDataEmissao: data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .returning();
    if (!row) throw new NotFoundException('Processo não encontrado');
    return row;
  }

  async pedirIsencao(escritorioId: string, processoId: string) {
    const p = await this.processos.obterPorId(escritorioId, processoId);
    if (!p.dajeEmitido) {
      throw new BadRequestException('DAJE ainda não foi emitido neste processo.');
    }
    const hoje = hojeYmd();
    const [row] = await this.drizzle.db
      .update(processo)
      .set({
        dajeStatus: 'ISENCAO_PEDIDA',
        dajeDataPedidoIsencao: hoje,
        updatedAt: new Date(),
      })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .returning();
    return row!;
  }

  async resultadoIsencao(
    escritorioId: string,
    processoId: string,
    dto: ResultadoIsencaoDajeDto,
  ) {
    const p = await this.processos.obterPorId(escritorioId, processoId);
    if (p.dajeStatus !== 'ISENCAO_PEDIDA') {
      throw new BadRequestException(
        'Só é possível registrar resultado após pedido de isenção.',
      );
    }
    const status =
      dto.resultado === 'DEFERIDA' ? 'ISENCAO_DEFERIDA' : 'ISENCAO_INDEFERIDA';
    const [row] = await this.drizzle.db
      .update(processo)
      .set({ dajeStatus: status, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .returning();
    if (dto.resultado === 'INDEFERIDA') {
      await this.hipossuf.garantirPendenciaSeNecessario(escritorioId, processoId);
    }
    return row!;
  }

  async registrarPagamento(escritorioId: string, processoId: string) {
    await this.processos.obterPorId(escritorioId, processoId);
    const hoje = hojeYmd();
    const [row] = await this.drizzle.db
      .update(processo)
      .set({
        dajeStatus: 'PAGO',
        dajeDataPagamento: hoje,
        updatedAt: new Date(),
      })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .returning();
    return row!;
  }

  async inadimplencia(escritorioId: string, processoId: string) {
    const p = await this.processos.obterPorId(escritorioId, processoId);
    if (!p.dajeEmitido) {
      throw new BadRequestException('DAJE não emitido.');
    }
    if (p.dajeStatus === 'PAGO' || p.dajeStatus === 'ISENCAO_DEFERIDA') {
      throw new BadRequestException('DAJE já regularizado.');
    }
    const perfil = await this.perfilDiligenciaVara(escritorioId, p.vara);
    const status =
      perfil === 'DILIGENTE' ? 'DIVIDA_ATIVA' : 'ARQUIVADO_SEM_PAGAMENTO';
    const [row] = await this.drizzle.db
      .update(processo)
      .set({ dajeStatus: status, updatedAt: new Date() })
      .where(
        and(eq(processo.id, processoId), eq(processo.escritorioId, escritorioId)),
      )
      .returning();
    return { processo: row!, perfilDiligencia: perfil };
  }
}
