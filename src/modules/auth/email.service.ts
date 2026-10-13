import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EnvConfig } from '../../config/env-config';
import { renderPasswordResetEmail } from './password-reset-email';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(private readonly config: EnvConfig) {
    this.resend = new Resend(config.resendApiKey);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, expiresInMinutes: number) {
    const content = renderPasswordResetEmail(resetUrl, expiresInMinutes);
    const { error } = await this.resend.emails.send({
      from: this.config.resendFromEmail,
      to: [to],
      replyTo: this.config.resendReplyTo,
      subject: 'Reset your CourtHub password',
      html: content.html,
      text: content.text,
    });

    if (error) throw new Error(`Resend email failed: ${error.message}`);
  }
}
