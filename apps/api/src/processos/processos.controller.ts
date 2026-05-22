import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Express } from 'express';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { ConfirmarBatchDto } from './dto/confirmar-batch.dto';
import { CreateProcessoDto } from './dto/create-processo.dto';
import { ListProcessosQueryDto } from './dto/list-processos.query.dto';
import { PosExtincaoDto } from './dto/pos-extincao.dto';
import { PosImprocedenciaDto } from './dto/pos-improcedencia.dto';
import { PosProcedenteParcialDto } from './dto/pos-procedente-parcial.dto';
import { UpdateProcessoDto } from './dto/update-processo.dto';
import { JusticaGratuitaProcessoDto } from './dto/justica-gratuita-processo.dto';
import { PatchAvaliacaoRecursoDto } from './dto/patch-avaliacao-recurso.dto';
import { DesistirProcessoDto } from './dto/desistir-processo.dto';
import { SobrestarProcessoDto } from './dto/sobrestar-processo.dto';
import { PosExtincaoService } from './pos-extincao.service';
import { PosImprocedenciaService } from './pos-improcedencia.service';
import { PosProcedenteParcialService } from './pos-procedente-parcial.service';
import { ProcessosService } from './processos.service';
import { ProcessosWorkflowService } from './processos-workflow.service';

function sanitizePdfFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/g, '').replace(/\0/g, '');
  const trimmed = base.trim().slice(0, 200);
  return trimmed || 'documento.pdf';
}

function pdfMulterFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const ok =
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/octet-stream';
  if (!ok) {
    cb(
      new BadRequestException(
        'Tipo de arquivo inválido. Envie um PDF.',
      ) as Error,
      false,
    );
    return;
  }
  cb(null, true);
}

@Controller('processos')
export class ProcessosController {
  constructor(
    private readonly processos: ProcessosService,
    private readonly posImprocedenciaService: PosImprocedenciaService,
    private readonly posExtincaoService: PosExtincaoService,
    private readonly posProcedenteParcialService: PosProcedenteParcialService,
    private readonly workflow: ProcessosWorkflowService,
  ) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProcessosQueryDto,
  ) {
    return this.processos.listar(user.escritorioId, query);
  }

  @Get('resumo')
  @Throttle(ThrottlePresets.processosList)
  resumo(@CurrentUser() user: AuthUser) {
    return this.processos.resumoIntimacoes(user.escritorioId);
  }

  @Post()
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateProcessoDto) {
    return this.processos.criarManual(user.escritorioId, dto);
  }

  @Post('upload-pdf')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoUploadPdf)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: pdfMulterFileFilter,
    }),
  )
  async uploadPdf(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo PDF no campo file.');
    }

    const nome = sanitizePdfFilename(file.originalname || 'documento.pdf');

    return this.processos.extrairPdfDecisao(
      user.escritorioId,
      file.buffer,
      nome,
    );
  }

  /** Alias do briefing (`extract-pdf`). */
  @Post('extract-pdf')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoUploadPdf)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: pdfMulterFileFilter,
    }),
  )
  async extractPdf(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo PDF no campo file.');
    }
    const nome = sanitizePdfFilename(file.originalname || 'documento.pdf');
    return this.processos.extrairPdfDecisao(
      user.escritorioId,
      file.buffer,
      nome,
    );
  }

  @Post('preview-pdf-batch')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPreviewPdfBatch)
  @UseInterceptors(
    FilesInterceptor('files', 30, {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: pdfMulterFileFilter,
    }),
  )
  async previewPdfBatch(
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    const list = files ?? [];
    if (!list.length) {
      throw new BadRequestException(
        'Envie ao menos um PDF no campo files (multipart).',
      );
    }
    return this.processos.previewPdfBatch(user.escritorioId, list);
  }

  @Post('confirmar-batch')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoConfirmarBatch)
  confirmarBatch(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmarBatchDto,
  ) {
    return this.processos.confirmarBatch(user.escritorioId, dto.items);
  }

  @Get('pdf-jobs/:jobId')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPdfJobStatus)
  statusPdfJob(
    @CurrentUser() user: AuthUser,
    @Param('jobId') jobId: string,
  ) {
    return this.processos.obterStatusJobPdf(user.escritorioId, jobId);
  }

  @Patch(':id')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPatch)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcessoDto,
  ) {
    return this.processos.atualizarParcial(
      user.escritorioId,
      id,
      dto,
      user.userId,
    );
  }

  @Post(':id/pos-improcedencia')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  posImprocedencia(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PosImprocedenciaDto,
  ) {
    return this.posImprocedenciaService.aplicar(
      user.escritorioId,
      id,
      dto,
      user.userId,
    );
  }

  @Post(':id/pos-extincao')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  posExtincao(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PosExtincaoDto,
  ) {
    return this.posExtincaoService.aplicar(user.escritorioId, id, dto);
  }

  @Post(':id/pos-procedente-parcial')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  posProcedenteParcial(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PosProcedenteParcialDto,
  ) {
    return this.posProcedenteParcialService.aplicar(
      user.escritorioId,
      id,
      dto,
      user.userId,
    );
  }

  @Get(':id/timeline')
  @Throttle(ThrottlePresets.processoGet)
  timeline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.processos.obterTimeline(user.escritorioId, id);
  }

  @Get(':id/observacoes')
  @Throttle(ThrottlePresets.processoGet)
  observacoes(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.listarObservacoes(user.escritorioId, id);
  }

  @Post(':id/sobrestar')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  sobrestar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SobrestarProcessoDto,
  ) {
    return this.workflow.sobrestar(user.escritorioId, id, dto);
  }

  @Post(':id/dessobrestar')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  dessobrestar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflow.dessobrestar(user.escritorioId, id);
  }

  @Post(':id/justica-gratuita')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  justicaGratuita(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JusticaGratuitaProcessoDto,
  ) {
    return this.workflow.justicaGratuita(user.escritorioId, id, dto);
  }

  @Post(':id/desistir')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPostManual)
  desistir(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DesistirProcessoDto,
  ) {
    return this.workflow.desistir(user.escritorioId, id, dto);
  }

  @Patch(':id/avaliacao-recurso')
  @Roles('admin', 'adm', 'advogado')
  @Throttle(ThrottlePresets.processoPatch)
  avaliacaoRecurso(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchAvaliacaoRecursoDto,
  ) {
    return this.workflow.patchAvaliacaoRecurso(user.escritorioId, id, dto);
  }

  @Get(':id')
  @Throttle(ThrottlePresets.processoGet)
  obter(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.processos.obterPorId(user.escritorioId, id);
  }

  @Delete(':id')
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.processoDelete)
  remover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.processos.remover(user.escritorioId, id);
  }
}
