import { describe, expect, it } from '@jest/globals';
import { BookingsRepository } from '../../src/modules/bookings/bookings.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('BookingsRepository', () => {
  it('supports court, pricing, booking, listing, and transition queries', async () => {
    const repository: any = new BookingsRepository(createMockDatabase());
    const booking = {
      id: '0199a111-1111-7111-8111-111111111111',
      courtId: '0199a111-1111-7111-8111-111111111112',
      contactName: 'Customer',
      contactPhone: '0901234567',
      startAt: new Date('2026-10-14T05:00:00.000Z'),
      endAt: new Date('2026-10-14T06:00:00.000Z'),
      status: 'CONFIRMED',
    };

    await expect(repository.findCourtForBooking('court-1')).resolves.toBeUndefined();
    await expect(repository.findPricingRules('venue-1', 'WED')).resolves.toEqual([]);
    await expect(repository.create(booking)).resolves.toBeUndefined();
    await expect(repository.findById('booking-1')).resolves.toBeUndefined();
    await expect(repository.listMine('user-1')).resolves.toEqual([]);
    await expect(repository.listForPartner('partner-1')).resolves.toEqual([]);
    await expect(repository.findForTransition('booking-1')).resolves.toBeUndefined();
    await expect(repository.transition('booking-1', 'CONFIRMED')).resolves.toBeUndefined();
    await expect(repository.listForAdmin()).resolves.toEqual([]);
  });
});
