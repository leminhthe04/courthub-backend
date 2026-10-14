import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { VenuesService, startOfVietnamDate } from '../../src/modules/venues/venues.service';
import { mockResolved } from '../helpers/mock-http';

describe('VenuesService', () => {
  it('normalizes public date input and rejects malformed dates', () => {
    expect(startOfVietnamDate('2026-10-14').toISOString()).toBe('2026-10-13T17:00:00.000Z');
    expect(() => startOfVietnamDate('14-10-2026')).toThrow(BadRequestException);
  });

  it('returns cursor-paginated public venues', async () => {
    const rows = [
      { id: '0199a111-1111-7111-8111-111111111111', name: 'Venue 1' },
      { id: '0199a111-1111-7111-8111-111111111112', name: 'Venue 2' },
      { id: '0199a111-1111-7111-8111-111111111113', name: 'Venue 3' },
    ];
    const repository = { listPublic: mockResolved(rows) };
    const service = new VenuesService(repository as any);
    await expect(service.listPublic({ limit: 2 })).resolves.toEqual({
      items: rows.slice(0, 2),
      nextCursor: rows[1].id,
      hasNextPage: true,
    });
    await expect(service.listPublic({ cursor: 'bad-cursor' })).rejects.toThrow(BadRequestException);
  });

  it('creates approved venues and aggregates courts and pricing rules', async () => {
    const repository = {
      createVenue: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockImplementation(async (values) => ({ ...values, status: 'APPROVED' })),
      listCourts: mockResolved([]),
      listPricingRules: mockResolved([]),
    };
    const service = new VenuesService(repository as any);
    const result = await service.createVenue('partner-1', {
      name: 'Arena',
      categoryId: 'cat-1',
      address: 'Address',
      city: 'Vinh Long',
    });
    expect(result.status).toBe('APPROVED');
    expect(result.courts).toEqual([]);
    expect(result.pricingRules).toEqual([]);
  });

  it('prevents unauthorized and unsafe court changes', async () => {
    const repository = {
      findCourtWithOwner: mockResolved({ ownerId: 'owner-1', court: { id: 'c1', isActive: true } }),
      hasFutureBookings: mockResolved(true),
      updateCourt: jest.fn(),
      softDeleteCourt: jest.fn(),
    };
    const service = new VenuesService(repository as any);
    await expect(service.updateCourt('other', 'c1', { name: 'New' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.updateCourt('owner-1', 'c1', { isActive: false })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.deleteCourt('owner-1', 'c1')).rejects.toThrow(BadRequestException);
    expect(repository.updateCourt).not.toHaveBeenCalled();
  });

  it('soft deletes a court without future bookings', async () => {
    const deleted = { id: 'c1', deletedAt: new Date() };
    const repository = {
      findCourtWithOwner: mockResolved({ ownerId: 'owner-1', court: { id: 'c1', isActive: true } }),
      hasFutureBookings: mockResolved(false),
      softDeleteCourt: mockResolved(deleted),
    };
    const service = new VenuesService(repository as any);
    await expect(service.deleteCourt('owner-1', 'c1')).resolves.toEqual(deleted);
  });

  it('rejects missing courts and overlapping pricing rules', async () => {
    const missing = new VenuesService({
      findCourtWithOwner: mockResolved(undefined),
    } as any);
    await expect(missing.updateCourt('owner-1', 'missing', {})).rejects.toThrow(NotFoundException);

    const repository = {
      listPricingRules: mockResolved([{ dayOfWeek: 'MON', startTime: '05:00', endTime: '10:00' }]),
      createPricingRule: jest.fn(),
    };
    const service = new VenuesService({
      ...repository,
      findOwnedVenue: mockResolved({ id: 'v1' }),
    } as any);
    await expect(
      service.createPricingRule('owner-1', 'v1', {
        dayOfWeek: 'MON',
        startTime: '09:00',
        endTime: '12:00',
        hourlyRate: 100000,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
