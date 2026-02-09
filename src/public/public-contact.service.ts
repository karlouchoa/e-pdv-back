import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PublicContactDto } from './dto/public-contact.dto';

type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  requireTls: boolean;
  from: string;
  to: string;
};

@Injectable()
export class PublicContactService {
  private readonly logger = new Logger(PublicContactService.name);
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  async sendContactEmail(dto: PublicContactDto) {
    const transport = this.getTransporter();
    const mailConfig = this.getMailConfig();

    const text = this.buildText(dto);
    const html = this.buildHtml(dto);

    try {
      await transport.sendMail({
        from: { name: dto.nome, address: mailConfig.from },
        to: mailConfig.to,
        replyTo: { name: dto.nome, address: dto.email },
        subject: `Contato goldPDV - ${dto.empresa}`,
        text,
        html,
      });
      return { ok: true };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        'Falha ao enviar email de contato.',
        err?.stack ?? String(error),
      );
      throw new InternalServerErrorException(
        'Nao foi possivel enviar sua mensagem agora.',
      );
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }
    const mailConfig = this.getMailConfig();
    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      requireTLS: mailConfig.requireTls,
      auth: {
        user: mailConfig.user,
        pass: mailConfig.pass,
      },
    });
    return this.transporter;
  }

  private getMailConfig(): MailConfig {
    const host = this.getRequired('CONTACT_SMTP_HOST');
    const user = this.getRequired('CONTACT_SMTP_USER');
    const pass = this.getRequired('CONTACT_SMTP_PASS');

    const port = this.getNumber('CONTACT_SMTP_PORT', 465);
    const secure = this.getBoolean('CONTACT_SMTP_SECURE', true);
    const requireTls = this.getBoolean('CONTACT_SMTP_TLS', true);

    const from =
      this.configService.get<string>('CONTACT_MAIL_FROM') ??
      'contato@goldpdv.com.br';
    const to =
      this.configService.get<string>('CONTACT_MAIL_TO') ??
      'karlouchoa@gmail.com';

    return {
      host,
      port,
      user,
      pass,
      secure,
      requireTls,
      from,
      to,
    };
  }

  private getRequired(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value || value.trim().length === 0) {
      throw new InternalServerErrorException(
        `Configuracao ausente para ${key}.`,
      );
    }
    return value.trim();
  }

  private getNumber(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private getBoolean(key: string, fallback: boolean): boolean {
    const raw = this.configService.get<string>(key);
    if (!raw) {
      return fallback;
    }
    return ['true', '1', 'yes', 'on'].includes(raw.trim().toLowerCase());
  }

  private buildText(dto: PublicContactDto): string {
    const lines = [
      `Nome: ${dto.nome}`,
      `Email: ${dto.email}`,
      `Telefone: ${dto.telefone}`,
      `Empresa: ${dto.empresa}`,
      `Segmento: ${dto.segmento}`,
      `Website: ${dto.website ?? '-'}`,
      '',
      'Desafio:',
      dto.desafio,
    ];
    return lines.join('\n');
  }

  private buildHtml(dto: PublicContactDto): string {
    const escape = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const website = dto.website?.trim() || '-';

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Contato goldPDV</h2>
        <p><strong>Nome:</strong> ${escape(dto.nome)}</p>
        <p><strong>Email:</strong> ${escape(dto.email)}</p>
        <p><strong>Telefone:</strong> ${escape(dto.telefone)}</p>
        <p><strong>Empresa:</strong> ${escape(dto.empresa)}</p>
        <p><strong>Segmento:</strong> ${escape(dto.segmento)}</p>
        <p><strong>Website:</strong> ${escape(website)}</p>
        <p><strong>Desafio:</strong></p>
        <p>${escape(dto.desafio)}</p>
      </div>
    `.trim();
  }
}
