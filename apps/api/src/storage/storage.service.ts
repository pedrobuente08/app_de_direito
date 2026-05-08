import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private readonly bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'pdf-imports';
    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async uploadPdfTemp(
    escritorioId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Supabase Storage não configurado');
    }
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const path = `${escritorioId}/tmp/${randomUUID()}-${safe}`;
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (error) {
      this.log.error(error.message);
      throw error;
    }
    return path;
  }

  async downloadPdf(path: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Supabase Storage não configurado');
    }
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(path);
    if (error || !data) {
      throw error ?? new Error('Download falhou');
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(path: string): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.storage.from(this.bucket).remove([path]);
  }
}
