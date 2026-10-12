import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { VenuesService, startOfVietnamDate } from '../src/modules/venues/venues.service';
import type { VenuesRepository } from '../src/modules/venues/venues.repository';

describe('VenuesModule', () => {
  it('converts a local Vietnam date to the start of that day', () => {
    expect(startOfVietnamDate('2026-10-09').toISOString()).toBe('2026-10-08T17:00:00.000Z');
  });

  it('rejects dates that do not use the YYYY-MM-DD format', () => {
    expect(() => startOfVietnamDate('09-10-2026')).toThrow(BadRequestException);
  });

  it('creates partner venue with APPROVED status immediately without waiting for admin approval', async () => {
    const mockRepo = {
      createVenue: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockImplementation(async (values) => ({
          ...values,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      listCourts: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([]),
      listOperatingHours: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([]),
      listPricingRules: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue([]),
    } as unknown as VenuesRepository;

    const service = new VenuesService(mockRepo);
    const result = await service.createVenue('owner-uuid-1', {
      name: 'CourtHub Arena',
      categoryId: 'cat-uuid-1',
      address: '123 Nguyen Trai',
      city: 'Ho Chi Minh City',
    });

    expect(mockRepo.createVenue).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'owner-uuid-1',
        name: 'CourtHub Arena',
        categoryId: 'cat-uuid-1',
        status: 'APPROVED',
      }),
    );
    expect(result.status).toBe('APPROVED');
    expect(result.courts).toEqual([]);
  });
});
