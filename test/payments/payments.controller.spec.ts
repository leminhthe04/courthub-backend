import { describe, expect, it } from '@jest/globals';
import { PaymentsController } from '../../src/modules/payments/payments.controller';
import { createAuthUser, mockResolved } from '../helpers/mock-http';

describe('PaymentsController', () => {
  it('delegates payment status, cancellation, retry, and webhook requests', async () => {
    const service: any = {
      getStatus: mockResolved('status'),
      cancel: mockResolved('cancelled'),
      retry: mockResolved('retry'),
      handleWebhook: mockResolved({ ok: true }),
    };
    const controller = new PaymentsController(service);
    const user = createAuthUser();
    const payload = { code: '00', data: { orderCode: 123 } };

    await expect(controller.status('payment-1')).resolves.toBe('status');
    await expect(controller.cancel('payment-1')).resolves.toBe('cancelled');
    await expect(controller.retry('payment-1', user)).resolves.toBe('retry');
    await expect(controller.webhook(payload)).resolves.toEqual({ ok: true });

    expect(service.getStatus).toHaveBeenCalledWith('payment-1');
    expect(service.cancel).toHaveBeenCalledWith('payment-1');
    expect(service.retry).toHaveBeenCalledWith('payment-1', user.userId);
    expect(service.handleWebhook).toHaveBeenCalledWith(payload);
  });
});
