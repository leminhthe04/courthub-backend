import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { CategoriesService } from '../../src/modules/categories/categories.service';
import { mockResolved } from '../helpers/mock-http';

describe('CategoriesService', () => {
  it('creates categories with normalized names and generated slugs', async () => {
    const repository = {
      findBySlug: mockResolved(undefined),
      create: jest.fn().mockImplementation(async (values) => values),
    };
    const service = new CategoriesService(repository as any);
    const result = await service.create({ name: 'Cầu lông' });

    expect(result).toEqual(
      expect.objectContaining({ name: 'Cầu lông', slug: 'cau-long', isActive: true }),
    );
    expect(repository.create).toHaveBeenCalled();
  });

  it('rejects duplicate slugs and protects categories in use', async () => {
    const duplicate = new CategoriesService({
      findBySlug: mockResolved({ id: 'c1' }),
    } as any);
    await expect(duplicate.create({ name: 'Badminton', slug: 'badminton' })).rejects.toThrow(
      ConflictException,
    );

    const inUse = new CategoriesService({
      findById: mockResolved({ id: 'c1' }),
      countVenuesUsingCategory: mockResolved(1),
    } as any);
    await expect(inUse.update('c1', { name: 'Tennis' })).rejects.toThrow(BadRequestException);
    await expect(inUse.delete('c1')).rejects.toThrow(BadRequestException);
  });

  it('updates and deletes unused categories', async () => {
    const repository = {
      findById: mockResolved({ id: 'c1', name: 'Old', slug: 'old' }),
      findBySlug: mockResolved(undefined),
      countVenuesUsingCategory: mockResolved(0),
      update: mockResolved({ id: 'c1', name: 'New' }),
      delete: mockResolved({ id: 'c1' }),
    };
    const service = new CategoriesService(repository as any);
    await expect(service.update('c1', { name: 'New' })).resolves.toEqual({ id: 'c1', name: 'New' });
    await expect(service.delete('c1')).resolves.toEqual({ id: 'c1' });
  });

  it('returns not found for missing categories', async () => {
    const service = new CategoriesService({
      findById: mockResolved(undefined),
    } as any);
    await expect(service.update('missing', { name: 'New' })).rejects.toThrow(NotFoundException);
    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });
});
