import { describe, expect, it } from '@jest/globals';
import { VenuesRepository } from '../../src/modules/venues/venues.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('VenuesRepository', () => {
  it('supports public, partner, schedule, court, and pricing queries', async () => {
    const repository: any = new VenuesRepository(createMockDatabase());

    await expect(repository.listPublic({ limit: 12 }, { limit: 12 })).resolves.toEqual([]);
    await expect(repository.findPublic('v1')).resolves.toBeUndefined();
    await expect(repository.findVenueWithCategory('v1')).resolves.toBeUndefined();
    await expect(repository.listCourts('v1')).resolves.toEqual([]);
    await expect(repository.listPricingRules('v1')).resolves.toEqual([]);
    await expect(
      repository.createPricingRule({ id: 'r1', venueId: 'v1' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.deletePricingRule('r1', 'v1')).resolves.toBeUndefined();
    await expect(repository.setPricingRules('v1', [])).resolves.toEqual([]);
    await expect(repository.listScheduleBookings([], new Date(), new Date())).resolves.toEqual([]);
    const createRepository: any = new VenuesRepository(
      createMockDatabase({
        returningRows: [{ id: 'v1' }],
      }),
    );
    createRepository.db = {
      insert: () => ({ values: () => ({ returning: async () => [{ id: 'v1' }] }) }),
    };
    createRepository.findVenueWithCategory = async () => ({ id: 'v1', name: 'Arena' });
    await expect(
      createRepository.createVenue({ id: 'v1', ownerId: 'u1', name: 'Arena' } as any),
    ).resolves.toEqual({ id: 'v1', name: 'Arena' });
    await expect(repository.listOwned('u1')).resolves.toEqual([]);
    await expect(repository.findOwnedVenue('u1', 'v1')).resolves.toBeUndefined();
    await expect(repository.updateVenue('v1', { name: 'Updated' })).resolves.toBeUndefined();
    await expect(
      repository.createCourt({ id: 'c1', venueId: 'v1', name: 'Court 1' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.findCourtWithOwner('c1')).resolves.toBeUndefined();
    await expect(repository.hasFutureBookings('c1', new Date())).resolves.toBe(false);
    await expect(repository.updateCourt('c1', { isActive: false })).resolves.toBeUndefined();
    await expect(repository.softDeleteCourt('c1', new Date())).resolves.toBeUndefined();
    await expect(repository.listForAdmin()).resolves.toEqual([]);
    await expect(repository.reviewVenue('v1', 'APPROVED')).resolves.toBeUndefined();
  });
});
