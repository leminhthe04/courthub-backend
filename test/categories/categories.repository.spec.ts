import { describe, expect, it } from '@jest/globals';
import { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('CategoriesRepository', () => {
  it('supports category listing, lookup, mutations, and usage counts', async () => {
    const repository: any = new CategoriesRepository(createMockDatabase());

    await expect(repository.list()).resolves.toEqual([]);
    await expect(repository.list(true)).resolves.toEqual([]);
    await expect(repository.listWithVenueCount()).resolves.toEqual([]);
    await expect(repository.findById('c1')).resolves.toBeUndefined();
    await expect(repository.findBySlug('badminton')).resolves.toBeUndefined();
    await expect(
      repository.create({ id: 'c1', name: 'Badminton', slug: 'badminton' }),
    ).resolves.toBeUndefined();
    await expect(repository.update('c1', { name: 'Tennis' })).resolves.toBeUndefined();
    await expect(repository.delete('c1')).resolves.toBeUndefined();
    await expect(repository.countVenuesUsingCategory('c1')).resolves.toBe(0);
  });
});
