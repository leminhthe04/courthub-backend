import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { mockResolved } from '../helpers/mock-http';

function createService(overrides: Record<string, unknown> = {}) {
  const repository = {
    expireDue: mockResolved(0),
    create: mockResolved({ id: 'payment-1', status: 'PENDING' }),
    findPaymentDetails: mockResolved(undefined),
    findPendingForCustomer: mockResolved(undefined),
    cancelPending: mockResolved(undefined),
    applyWebhook: mockResolved(undefined),
    ...overrides,
  };
  const payos = {
    createPaymentLink: mockResolved({ checkoutUrl: 'https://payos.example/checkout' }),
    verifyWebhook: mockResolved({ orderCode: '123', amount: 100000, code: '00' }),
  };
  const gateway = { emitPaymentUpdated: jest.fn() };
  const config = {
    paymentHoldMinutes: 15,
    payosReturnUrl: 'https://courthub.io.vn/en/payment/result',
    payosCancelUrl: 'https://courthub.io.vn/en/payment/result',
  };
  return {
    service: new PaymentsService(repository as any, payos as any, gateway as any, config as any),
    repository,
    payos,
    gateway,
  };
}

describe('PaymentsService', () => {
  it('creates a pending payment link for a booking', async () => {
    const { service, repository, payos } = createService();

    const result = await service.createForBooking({
      bookingId: 'booking-1',
      amount: 100000.4,
      description: 'Court booking',
      contactName: 'Customer',
      contactEmail: null,
      contactPhone: '0901234567',
    });

    expect(result.checkoutUrl).toBe('https://payos.example/checkout');
    expect(repository.expireDue).toHaveBeenCalled();
    expect(payos.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100000,
        buyerName: 'Customer',
        buyerEmail: undefined,
        buyerPhone: '0901234567',
      }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-1',
        amount: 100000,
        status: 'PENDING',
        checkoutUrl: 'https://payos.example/checkout',
      }),
    );
  });

  it('returns public payment status and expires due payments first', async () => {
    const details = {
      payment: {
        id: 'payment-1',
        bookingId: 'booking-1',
        status: 'PENDING',
        amount: 100000,
        expiresAt: new Date('2026-10-15T10:15:00.000Z'),
        checkoutUrl: 'https://payos.example/checkout',
      },
      bookingId: 'booking-1',
      bookingStatus: 'AWAITING_PAYMENT',
      contactName: 'Customer',
      contactEmail: null,
      contactPhone: '0901234567',
      startAt: new Date('2026-10-16T05:00:00.000Z'),
      endAt: new Date('2026-10-16T06:00:00.000Z'),
      bookingCreatedAt: new Date('2026-10-15T10:00:00.000Z'),
      courtId: 'court-1',
      courtName: 'Court 1',
      venueId: 'venue-1',
      venueName: 'Arena',
      venueAddress: '1 Main Street',
      venueWard: 'Ward 1',
      venueProvince: 'Vinh Long',
    };
    const { service, repository } = createService({ findPaymentDetails: mockResolved(details) });

    await expect(service.getStatus('payment-1')).resolves.toMatchObject({
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      status: 'PENDING',
      contactEmail: null,
      court: { id: 'court-1', name: 'Court 1' },
      venue: { province: 'Vinh Long' },
    });
    expect(repository.expireDue).toHaveBeenCalled();
  });

  it('rejects missing and unavailable retry payments', async () => {
    const missing = createService();
    await expect(missing.service.retry('payment-1', 'customer-1')).rejects.toThrow(
      NotFoundException,
    );

    const unavailable = createService({
      findPendingForCustomer: mockResolved({
        payment: { status: 'PAID', expiresAt: new Date(Date.now() + 60000) },
        bookingStatus: 'CONFIRMED',
      }),
    });
    await expect(unavailable.service.retry('payment-1', 'customer-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cancels a pending payment and emits an update', async () => {
    const cancelled = { id: 'payment-1', status: 'CANCELLED' };
    const { service, repository, gateway } = createService({
      cancelPending: mockResolved({ payment: cancelled, changed: true }),
      findPaymentDetails: mockResolved({ payment: cancelled, bookingId: 'booking-1' }),
    });

    await expect(service.cancel('payment-1')).resolves.toMatchObject({
      paymentId: 'payment-1',
      status: 'CANCELLED',
    });
    expect(repository.cancelPending).toHaveBeenCalledWith('payment-1');
    expect(gateway.emitPaymentUpdated).toHaveBeenCalledWith(cancelled);
  });

  it('verifies and applies successful webhook payments', async () => {
    const updated = { id: 'payment-1', status: 'PAID' };
    const { service, payos, repository, gateway } = createService({
      applyWebhook: mockResolved(updated),
    });
    const payload = { code: '00', data: { orderCode: 456, amount: 100000 } };

    await expect(service.handleWebhook(payload)).resolves.toEqual({ ok: true });
    expect(payos.verifyWebhook).toHaveBeenCalledWith(payload);
    expect(repository.applyWebhook).toHaveBeenCalledWith('123', 100000, true);
    expect(gateway.emitPaymentUpdated).toHaveBeenCalledWith(updated);
  });

  it('accepts PayOS first-connection webhook handshake', async () => {
    const { service, payos } = createService();

    await expect(service.handleWebhook({ data: { orderCode: 123 } })).resolves.toEqual({
      ok: true,
    });
    expect(payos.verifyWebhook).not.toHaveBeenCalled();
  });
});
