import { BadRequestException, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { sentenca } from '../db/schema/sentenca';
import { ProcessosService } from '../processos/processos.service';
import type { CreateSentencaBodyDto } from './dto/create-sentenca-body.dto';
import { validarValorSentenca } from './sentenca-validacao';

@Injectable()
export class SentencasService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly processos: ProcessosService,
  ) {}

  async listarPorProcesso(escritorioId: string, processoId: string) {
    await this.processos.obterPorId(escritorioId, processoId);
    return this.drizzle.db
      .select()
      .from(sentenca)
      .where(
        and(
          eq(sentenca.processoId, processoId),
          eq(sentenca.escritorioId, escritorioId),
        ),
      )
      .orderBy(desc(sentenca.data), desc(sentenca.createdAt));
  }

  async criar(escritorioId: string, dto: CreateSentencaBodyDto) {
    await this.processos.obterPorId(escritorioId, dto.processoId);
    const resultado = dto.resultado.trim();
    const favoravel = dto.favoravelPara.trim().toUpperCase();
    if (!['AUTOR', 'REU'].includes(favoravel)) {
      throw new BadRequestException(
        'favoravelPara deve ser AUTOR ou REU.',
      );
    }
    try {
      validarValorSentenca(resultado, dto.valor);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const [row] = await this.drizzle.db
      .insert(sentenca)
      .values({
        escritorioId,
        processoId: dto.processoId,
        grau: dto.grau.trim(),
        data: dto.data,
        valor: dto.valor ?? null,
        resultado: dto.resultado.trim(),
        favoravelPara: dto.favoravelPara.trim(),
        turma: dto.turma?.trim() || null,
        assessorJulgador: dto.assessorJulgador?.trim() || null,
        turnoJulgamento: dto.turnoJulgamento?.trim() || null,
        observacoes: dto.observacoes?.trim() || null,
      })
      .returning();
    await this.processos.recalcularProcedenteAposSentenca(
      escritorioId,
      dto.processoId,
    );
    return row;
  }
}
