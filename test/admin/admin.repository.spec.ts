import { describe, expect, it } from '@jest/globals';
import { AdminRepository } from '../../src/modules/admin/admin.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('AdminRepository', () => {
  it('executes user queries and admin status updates', async () => {
    const repository: any = new AdminRepository(createMockDatabase());

    await expect(repository.listUsers()).resolves.toEqual([]);
    await expect(repository.findUser('u1')).resolves.toBeUndefined();
    await expect(repository.countActiveAdmins()).resolves.toBe(0);
    await expect(repository.updateUserRole('u1', 'PARTNER')).resolves.toBeUndefined();
    await expect(repository.updateUserStatus('u1', false)).resolves.toBeUndefined();
  });
});
