import { describe, expect, it } from '@jest/globals';
import { PartnerRequestsRepository } from '../../src/modules/partner-requests/partner-requests.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('PartnerRequestsRepository', () => {
  it('supports request lookup, creation, resubmission, listing, and review', async () => {
    const repository: any = new PartnerRequestsRepository(createMockDatabase());

    await expect(repository.findByUserId('u1')).resolves.toBeUndefined();
    await expect(
      repository.create({ id: 'r1', userId: 'u1', message: null }),
    ).resolves.toBeUndefined();
    await expect(repository.resubmit('r1', 'Updated message')).resolves.toBeUndefined();
    await expect(repository.listAll()).resolves.toEqual([]);
    await expect(repository.review('r1', 'APPROVED', 'admin-1')).resolves.toBeUndefined();
  });
});
