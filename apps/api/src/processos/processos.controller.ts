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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Express } from 'express';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { CreateProcessoDto } from './dto/create-processo.dto';
import { ListProcessosQueryDto } from './dto/list-processos.query.dto';
import { UpdateProcessoDto } from './dto/update-processo.dto';
import { ProcessosService } from './processos.service';

function sanitizePdfFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/g, '').replace(/\0/g, '');
  const trimmed = base.trim().slice(0, 200);
  return trimmed || 'documento.pdf';
}

@Controller('processos')
export class ProcessosController {
  constructor(private readonly processos: ProcessosService) {}

  @Get()
  @Throttle(ThrottlePresets.processosList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query() query: ListProcessosQueryDto,
  ) {
    return this.processos.listar(user.escritorioId, query);
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
      fileFilter: (_req, file, cb) => {
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
      },
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
      fileFilter: (_req, file, cb) => {
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
      },
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
    return this.processos.atualizarParcial(user.escritorioId, id, dto);
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
