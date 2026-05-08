import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ProcessosService } from '../processos/processos.service';
import { StorageService } from '../storage/storage.service';

export type PdfExtractJob = {
  escritorioId: string;
  filename: string;
  storagePath: string;
};

@Processor('pdf-extract')
export class PdfExtractProcessor extends WorkerHost {
  private readonly log = new Logger(PdfExtractProcessor.name);

  constructor(
    private readonly processos: ProcessosService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  override async process(job: Job<PdfExtractJob>) {
    const { escritorioId, filename, storagePath } = job.data;
    const buffer = await this.storage.downloadPdf(storagePath);
    try {
      const result = await this.processos.extrairPdfUpload(
        escritorioId,
        buffer,
        filename,
      );
      return result;
    } finally {
      await this.storage.remove(storagePath).catch(() => undefined);
    }
  }
}
