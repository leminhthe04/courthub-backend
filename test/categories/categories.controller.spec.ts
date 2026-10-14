import { describe, expect, it } from '@jest/globals';
import {
  AdminCategoriesController,
  CategoriesController,
} from '../../src/modules/categories/categories.controller';
import { mockResolved } from '../helpers/mock-http';

describe('CategoriesController', () => {
  it('delegates public and admin category endpoints', async () => {
    const service: any = {
      listPublic: mockResolved(['public']),
      listForAdmin: mockResolved(['admin']),
      create: mockResolved('created'),
      update: mockResolved('updated'),
      delete: mockResolved('deleted'),
    };
    const publicController = new CategoriesController(service as any);
    const adminController = new AdminCategoriesController(service as any);

    await expect(publicController.list()).resolves.toEqual(['public']);
    await expect(adminController.list()).resolves.toEqual(['admin']);
    await expect(adminController.create({ name: 'Badminton' })).resolves.toBe('created');
    await expect(adminController.update('c1', { name: 'Tennis' })).resolves.toBe('updated');
    await expect(adminController.delete('c1')).resolves.toBe('deleted');
    expect(service.update).toHaveBeenCalledWith('c1', { name: 'Tennis' });
  });
});
