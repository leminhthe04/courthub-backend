import { describe, expect, it } from '@jest/globals';
import { PasswordResetRepository } from '../../src/modules/auth/password-reset.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('PasswordResetRepository', () => {
  it('supports token lifecycle operations', async () => {
    const repository: any = new PasswordResetRepository(createMockDatabase());

    await expect(repository.revokeActiveForUser('u1')).resolves.toBeUndefined();
    await expect(
      repository.create({ id: 't1', userId: 'u1', tokenHash: 'hash' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.findValidByHash('hash')).resolves.toBeUndefined();
    await expect(repository.consumeAndResetPassword('t1', 'u1', 'new-hash')).resolves.toBe(false);
  });
});
