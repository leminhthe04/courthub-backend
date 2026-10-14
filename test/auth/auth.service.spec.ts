import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from '../../src/modules/auth/auth.service';
import { createAuthUser } from '../helpers/auth.fixtures';
import { mockResolved } from '../helpers/mock-http';

describe('AuthService', () => {
  it('registers a customer with normalized contact information', async () => {
    const repository = {
      findByContact: mockResolved(undefined),
      createCustomer: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockImplementation(async (values) => ({ ...createAuthUser(), ...values })),
      createSession: mockResolved(undefined),
    };
    const jwt = { sign: jest.fn().mockReturnValue('access-token') };
    const service = new AuthService(repository as any, jwt as any);
    const result = await service.register({
      fullName: ' User ',
      email: ' USER@EXAMPLE.COM ',
      phone: '090 123 4567',
      password: 'Password123!',
    } as any);

    expect(repository.findByContact).toHaveBeenCalledWith('user@example.com', '0901234567');
    expect(repository.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'User', email: 'user@example.com', phone: '0901234567' }),
    );
    expect(result.accessToken).toBe('access-token');
  });

  it('rejects duplicate contacts and inactive password logins', async () => {
    const repository = {
      findByContact: mockResolved(createAuthUser()),
      findByIdentifier: mockResolved(createAuthUser({ isActive: false })),
    };
    const service = new AuthService(repository as any, {} as JwtService);
    await expect(
      service.register({
        fullName: 'User',
        email: 'user@example.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.login({ identifier: 'user@example.com', password: 'Password123!' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('sanitizes profile updates and rejects duplicate contacts', async () => {
    const user = createAuthUser();
    const repository = {
      findById: mockResolved(user),
      findByContactExcludingUser: mockResolved(undefined),
      updateUser: mockResolved({ ...user, fullName: 'New Name' }),
    };
    const service = new AuthService(repository as any, {} as JwtService);
    await expect(
      service.updateProfile(user.id, {
        fullName: ' New Name ',
        email: 'NEW@example.com',
        phone: '090 999 9999',
      } as any),
    ).resolves.toEqual(expect.objectContaining({ fullName: 'New Name' }));

    const duplicate = new AuthService(
      {
        ...repository,
        findByContactExcludingUser: mockResolved(createAuthUser({ id: 'other' })),
      } as any,
      {} as JwtService,
    );
    await expect(
      duplicate.updateProfile(user.id, { fullName: 'Name', email: 'other@example.com' } as any),
    ).rejects.toThrow(ConflictException);
  });
});
