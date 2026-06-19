import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import nodemailer from 'nodemailer';

interface SendOtpMailOptions {
  to: string;
  subject: string;
  title: string;
  name: string;
  username: string;
  otp: string;
  expireMinutes: number;
  description: string;
  template: 'forgot-password' | 'change-email' | 'business-registration';
}

interface SendMailResult {
  success: boolean;
  mode: 'SMTP' | 'DEV_FALLBACK';
  messageId?: string;
  error?: string;
}

interface EmailTemplate {
  html: string;
  attachments: Array<{
    filename: string;
    path: string;
    cid: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtpMail(options: SendOtpMailOptions): Promise<SendMailResult> {
    const host =
      this.configService.get<string>('MAIL_HOST') ||
      this.configService.get<string>('VNA_MAIL_HOST') ||
      (this.configService.get<string>('SENDGRID_KEY')
        ? 'smtp.sendgrid.net'
        : '');
    const user =
      this.configService.get<string>('MAIL_USER') ||
      this.configService.get<string>('VNA_MAIL_USER') ||
      (this.configService.get<string>('SENDGRID_KEY') ? 'apikey' : '');
    const password =
      this.configService.get<string>('MAIL_PASSWORD') ||
      this.configService.get<string>('VNA_MAIL_PASSWORD') ||
      this.configService.get<string>('SENDGRID_KEY');
    const devFallback = this.isEnabled('MAIL_DEV_LOG_OTP');

    if (!host || !user || !password) {
      if (devFallback) {
        this.logger.warn(
          `[DEV_FALLBACK] Missing mail config. To=${options.to}; OTP=${options.otp}`,
        );
        return { success: true, mode: 'DEV_FALLBACK' };
      }

      this.logger.warn(`[SMTP] Missing mail config. To=${options.to}`);

      return {
        success: false,
        mode: 'SMTP',
        error: 'Missing mail config',
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port: this.getNumber('MAIL_PORT', this.getNumber('VNA_MAIL_PORT', 587)),
      secure:
        this.isEnabled('MAIL_SECURE') || this.isEnabled('VNA_MAIL_SECURE'),
      auth: {
        user,
        pass: password,
      },
    });

    try {
      const emailTemplate = this.renderOtpTemplate(options);
      const result = await transporter.sendMail({
        from:
          this.configService.get<string>('MAIL_FROM') ||
          this.configService.get<string>('VNA_MAIL_FROM') ||
          'TTS VNA <no-reply@tts-vna.local>',
        to: options.to,
        subject: options.subject,
        html: emailTemplate.html,
        attachments: emailTemplate.attachments,
      });

      return {
        success: true,
        mode: 'SMTP',
        messageId: result.messageId,
      };
    } catch (error: any) {
      this.logger.error(
        `[SMTP] Send failed. To=${options.to}; Host=${host}; Error=${error?.message || error}`,
      );

      if (devFallback) {
        this.logger.warn(
          `[DEV_FALLBACK] SMTP failed. To=${options.to}; OTP=${options.otp}`,
        );
        return { success: true, mode: 'DEV_FALLBACK' };
      }

      return {
        success: false,
        mode: 'SMTP',
        error: error?.message || `${error}`,
      };
    }
  }

  private renderOtpTemplate(options: SendOtpMailOptions): EmailTemplate {
    const logo = this.resolveLogo();

    const template = this.readTemplate(options.template);

    return {
      html: template
        .replace(/\$1/g, options.name || options.username)
        .replace(/\$2/g, options.username)
        .replace(/\$3/g, options.otp)
        .replace(/\$4/g, options.expireMinutes.toString())
        .replace(/\$5/g, logo.src),
      attachments: logo.attachment ? [logo.attachment] : [],
    };
  }

  private resolveLogo() {
    const logoUrl =
      this.configService.get<string>('MAIL_LOGO_URL') ||
      this.configService.get<string>('VNA_EMAIL_LOGO_URL');

    if (logoUrl) {
      return { src: logoUrl, attachment: null };
    }

    const logoPath = this.findTemplateAsset('vna-group-logo-email.jpg');
    if (!logoPath) {
      return { src: '', attachment: null };
    }

    const cid = 'vna-group-logo-email';
    return {
      src: `cid:${cid}`,
      attachment: {
        filename: 'vna-group-logo-email.jpg',
        path: logoPath,
        cid,
      },
    };
  }

  private readTemplate(template: SendOtpMailOptions['template']) {
    const fileName = `${template}.html`;
    const templatePath = this.findTemplateAsset(fileName);

    if (!templatePath) {
      throw new Error(`Email template not found: ${fileName}`);
    }

    return fs.readFileSync(templatePath, 'utf8');
  }

  private findTemplateAsset(fileName: string) {
    const candidates = [
      path.resolve(process.cwd(), 'src', 'templates', fileName),
      path.resolve(process.cwd(), 'dist', 'src', 'templates', fileName),
      path.resolve(process.cwd(), 'dist', 'templates', fileName),
      path.resolve(__dirname, '..', 'templates', fileName),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  private getNumber(key: string, fallback: number) {
    const value = this.configService.get<string>(key);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private isEnabled(key: string) {
    return (
      `${this.configService.get<string>(key) || ''}`.toLowerCase() === 'true'
    );
  }
}
