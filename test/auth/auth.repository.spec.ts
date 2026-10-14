import { describe, expect, it } from '@jest/globals';
import { AuthRepository } from '../../src/modules/auth/auth.repository';
import { createMockDatabase } from '../helpers/mock-database';

describe('AuthRepository', () => {
  it('supports user and session persistence operations', async () => {
    const repository: any = new AuthRepository(createMockDatabase());

    await expect(repository.findByContact('user@example.com', null)).resolves.toBeUndefined();
    await expect(repository.findByContact(null, '0901234567')).resolves.toBeUndefined();
    await expect(
      repository.findByContactExcludingUser('u1', 'user@example.com', null),
    ).resolves.toBeUndefined();
    await expect(repository.findByGoogleSubject('google-subject')).resolves.toBeUndefined();
    await expect(repository.findByIdentifier('user@example.com')).resolves.toBeUndefined();
    await expect(repository.findById('u1')).resolves.toBeUndefined();
    await expect(
      repository.createCustomer({ id: 'u1', fullName: 'User' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.updateUser('u1', { fullName: 'Updated' })).resolves.toBeUndefined();
    await expect(
      repository.createSession({ id: 's1', userId: 'u1' } as any),
    ).resolves.toBeUndefined();
    await expect(repository.findSessionByHash('hash')).resolves.toBeUndefined();
    await expect(repository.findSessionById('s1')).resolves.toBeUndefined();
    await expect(
      repository.updateSession('s1', { isRevoked: true } as any),
    ).resolves.toBeUndefined();
    await expect(repository.revokeSession('s1', 'LOGOUT')).resolves.toBeUndefined();
    await expect(
      repository.revokeAllUserSessions('u1', 'REVOKED_BY_ADMIN'),
    ).resolves.toBeUndefined();
    await expect(repository.listUserSessions('u1')).resolves.toEqual([]);
  });
});
