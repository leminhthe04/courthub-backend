import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import type { BookingsRepository } from '../../src/modules/bookings/bookings.repository';
import { mockResolved } from '../helpers/mock-http';

describe('BookingsService', () => {
  const court = { id: 'court-1', venueId: 'venue-1', courtActive: true, venueStatus: 'APPROVED' };
  const pricing = [{ startTime: '05:00', endTime: '22:00', hourlyRate: 150000 }];

  function createService(overrides: any = {}) {
    return new BookingsService(
      {
        findCourtForBooking: mockResolved(court),
        findPricingRules: mockResolved(pricing),
        create: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockImplementation(async (values) => ({ ...values, createdAt: new Date() })),
        listMine: mockResolved([]),
        listForPartner: mockResolved([]),
        listForAdmin: mockResolved([]),
        cancel: mockResolved(undefined),
        ...overrides,
      } as unknown as BookingsRepository,
      {
        createForBooking: mockResolved({
          payment: {
            id: 'payment-1',
            bookingId: 'booking-1',
            status: 'PENDING',
            amount: 150000,
            checkoutUrl: 'https://payos.example/checkout',
            expiresAt: new Date(),
          },
        }),
      } as any,
    );
  }

  const dto = {
    courtId: 'court-1',
    startAt: '2026-10-14T12:00:00+07:00',
    endAt: '2026-10-14T13:00:00+07:00',
    contactName: 'Customer',
    contactPhone: '0901234567',
  };

  it('creates a payment-hold booking and calculates its price', async () => {
    const service = createService();
    const result = await service.create(dto, null);
    expect(result.booking.status).toBe('AWAITING_PAYMENT');
    expect(result.booking.totalAmount).toBe(150000);
  });

  it('rejects missing court, inactive court, missing phone, and missing pricing', async () => {
    await expect(
      createService({ findCourtForBooking: mockResolved(undefined) }).create(dto, null),
    ).rejects.toThrow(NotFoundException);
    await expect(
      createService({
        findCourtForBooking: mockResolved({ ...court, courtActive: false }),
      }).create(dto, null),
    ).rejects.toThrow(BadRequestException);
    await expect(createService().create({ ...dto, contactPhone: '' }, null)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      createService({ findPricingRules: mockResolved([]) }).create(dto, null),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns a conflict when the repository detects an overlap', async () => {
    const service = createService({ create: mockResolved(undefined) });
    await expect(service.create(dto, null)).rejects.toThrow(ConflictException);
  });

  it('delegates list and partner transition operations', async () => {
    const repository = {
      listMine: mockResolved(['mine']),
      listForPartner: mockResolved(['partner']),
      listForAdmin: mockResolved(['admin']),
      findForTransition: mockResolved({ booking: { status: 'PENDING' }, ownerId: 'partner-1' }),
      transition: mockResolved({ id: 'b1' }),
    };
    const service = new BookingsService(repository as any, {} as any);
    await expect(service.listMine('u1')).resolves.toEqual(['mine']);
    await expect(service.listForPartner('p1')).resolves.toEqual(['partner']);
    await expect(service.listForAdmin()).resolves.toEqual(['admin']);
    await expect(
      service.transition('b1', { userId: 'partner-1', role: 'PARTNER' } as any, 'CONFIRMED'),
    ).resolves.toEqual({ id: 'b1' });
    expect(repository.transition).toHaveBeenCalledWith('b1', 'CONFIRMED');
  });
});
