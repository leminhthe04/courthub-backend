import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { createAuthUser } from '../helpers/auth.fixtures';
import { mockResolved } from '../helpers/mock-http';

describe('Auth strategies', () => {
  it('maps an active JWT user to AuthUser', async () => {
    const strategy = new JwtStrategy(
      { jwtSecret: 'secret' } as any,
      {
        findById: mockResolved(createAuthUser()),
      } as any,
    );
    await expect(strategy.validate({ sub: 'user-1' } as any)).resolves.toMatchObject({
      userId: expect.any(String),
      role: 'CUSTOMER',
    });
  });

  it('rejects missing or inactive JWT users', async () => {
    const repository = { findById: mockResolved(undefined) };
    const strategy = new JwtStrategy({ jwtSecret: 'secret' } as any, repository as any);
    await expect(strategy.validate({ sub: 'missing' } as any)).rejects.toThrow(
      UnauthorizedException,
    );
    repository.findById.mockResolvedValue(createAuthUser({ isActive: false }));
    await expect(strategy.validate({ sub: 'inactive' } as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
