import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  isEnabled(): boolean {
    return !!this.transporter;
  }

  async send(options: Mail.Options): Promise<void> {
    if (!this.transporter) {
      this.log.warn('SMTP não configurado — e-mail não enviado.');
      return;
    }
    const from =
      process.env.SMTP_FROM?.trim() ||
      process.env.SMTP_USER?.trim() ||
      'no-reply@localhost';
    await this.transporter.sendMail({ from, ...options });
  }
}
