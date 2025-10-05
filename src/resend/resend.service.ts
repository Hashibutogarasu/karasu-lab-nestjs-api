import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { sendResendEmail } from '../utils/resend/server';

@Injectable()
export class ResendService {
  private readonly resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail({
    to,
    html,
    subject,
    from,
  }: {
    to: string | string[];
    html: string;
    subject: string;
    from: string;
  }) {
    return await sendResendEmail(this.resend, to, html, subject, from);
  }
}
