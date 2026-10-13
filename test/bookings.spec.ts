import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { bookingWindowError } from '../src/modules/bookings/booking-rules';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import type { BookingsRepository } from '../src/modules/bookings/bookings.repository';

describe('BookingsModule', () => {
  it('accepts a 90-minute booking aligned to 30-minute slots', () => {
    const start = new Date('2026-10-09T07:30:00+07:00');
    const end = new Date('2026-10-09T09:00:00+07:00');

    expect(bookingWindowError(start, end)).toBeNull();
  });

  it('rejects a booking starting at 15 minutes past the hour', () => {
    const start = new Date('2026-10-09T07:15:00+07:00');
    const end = new Date('2026-10-09T09:00:00+07:00');

    expect(bookingWindowError(start, end)).toBeTruthy();
  });

  it('rejects a booking that crosses a local calendar day', () => {
    const start = new Date('2026-10-09T23:30:00+07:00');
    const end = new Date('2026-10-10T00:30:00+07:00');

    expect(bookingWindowError(start, end)).toBeTruthy();
  });

  it('calculates total booking price across multiple time pricing rules', async () => {
    const mockRepo = {
      findCourtForBooking: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'court-1',
        venueId: 'venue-1',
        courtActive: true,
        venueStatus: 'APPROVED',
      }),
      findOperatingHours: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'hours-1',
        venueId: 'venue-1',
        dayOfWeek: 5,
        openTime: '05:00',
        closeTime: '23:00',
        isClosed: false,
      }),
      findPricingRules: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([
        {
          id: 'rule-1',
          venueId: 'venue-1',
          startTime: '05:00',
          endTime: '13:00',
          hourlyRate: 150000,
        },
        {
          id: 'rule-2',
          venueId: 'venue-1',
          startTime: '13:00',
          endTime: '22:00',
          hourlyRate: 200000,
        },
      ]),
      create: jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async (values) => ({
        ...values,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as BookingsRepository;

    const service = new BookingsService(mockRepo);
    // Friday: 2026-10-09, 12:30 to 14:00 (3 slots: 1x 150k/h + 2x 200k/h = 75k + 100k + 100k = 275k)
    const result = await service.create(
      {
        courtId: 'court-1',
        startAt: '2026-10-09T12:30:00+07:00',
        endAt: '2026-10-09T14:00:00+07:00',
        contactPhone: '0901234567',
        contactName: 'John Doe',
      },
      null,
    );

    expect(result.booking.totalAmount).toBe(275000);
  });

  it('rejects booking when no pricing rule covers the requested slot', async () => {
    const mockRepo = {
      findCourtForBooking: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'court-1',
        venueId: 'venue-1',
        courtActive: true,
        venueStatus: 'APPROVED',
      }),
      findOperatingHours: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'hours-1',
        venueId: 'venue-1',
        dayOfWeek: 5,
        openTime: '05:00',
        closeTime: '23:00',
        isClosed: false,
      }),
      findPricingRules: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([
        {
          id: 'rule-1',
          venueId: 'venue-1',
          startTime: '05:00',
          endTime: '12:00',
          hourlyRate: 150000,
        },
      ]),
    } as unknown as BookingsRepository;

    const service = new BookingsService(mockRepo);
    await expect(
      service.create(
        {
          courtId: 'court-1',
          startAt: '2026-10-09T12:30:00+07:00',
          endAt: '2026-10-09T13:30:00+07:00',
          contactPhone: '0901234567',
          contactName: 'John Doe',
        },
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
