import { describe, expect, it, jest } from '@jest/globals';
import { EmailService } from '../../src/modules/auth/email.service';

describe('EmailService', () => {
  it('renders and sends a password reset email through Resend', async () => {
    const service: any = new EmailService({
      resendApiKey: 're_test_key',
      resendFromEmail: 'CourtHub <no-reply@courthub.io.vn>',
      resendReplyTo: 'support@courthub.io.vn',
    } as any);
    const send = jest
      .spyOn(service.resend.emails, 'send')
      .mockResolvedValue({ data: { id: 'email-1' }, error: null } as any);

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'https://courthub.io.vn/reset', 30),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['user@example.com'], replyTo: 'support@courthub.io.vn' }),
    );
  });
});
