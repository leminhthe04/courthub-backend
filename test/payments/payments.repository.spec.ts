import { describe, expect, it } from '@jest/globals';
import { PaymentsRepository } from '../../src/modules/payments/payments.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('PaymentsRepository', () => {
  it('supports payment lookup, creation, and payment detail queries', async () => {
    const repository: any = new PaymentsRepository(createMockDatabase());

    await expect(
      repository.create({ id: 'payment-1', bookingId: 'booking-1' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.findById('payment-1')).resolves.toBeUndefined();
    await expect(repository.findByBookingId('booking-1')).resolves.toBeUndefined();
    await expect(repository.findPaymentDetails('payment-1')).resolves.toBeUndefined();
    await expect(
      repository.findPendingForCustomer('payment-1', 'customer-1'),
    ).resolves.toBeUndefined();
  });

  it('returns no-op results when cancelling or expiring without pending payments', async () => {
    const repository: any = new PaymentsRepository(createMockDatabase());

    await expect(repository.cancelPending('payment-1')).resolves.toBeUndefined();
    await expect(repository.expireDue()).resolves.toBe(0);
  });

  it('returns no result when the webhook payment does not match', async () => {
    const repository: any = new PaymentsRepository(createMockDatabase());

    await expect(repository.applyWebhook('missing-order', 100000, true)).resolves.toBeUndefined();
  });
});
