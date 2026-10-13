import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from '../src/modules/auth/auth.service';
import type {
  AuthRepository,
  AuthUserRecord,
  SessionRecord,
} from '../src/modules/auth/auth.repository';
import type { RegisterDto } from '../src/modules/auth/dto/auth.dto';
import { ErrorCode } from '../src/common/error-codes';
import { createHash } from 'node:crypto';

describe('AuthModule', () => {
  it('requires email or phone when registering a customer', async () => {
    const service = new AuthService({} as AuthRepository, {} as JwtService);
    const dto = { fullName: 'Demo Customer', password: 'Password123!' } as RegisterDto;

    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rotates refresh token and revokes previous session on refresh', async () => {
    const mockUser: AuthUserRecord = {
      id: '018f0000-0000-7000-0000-000000000001',
      fullName: 'Test User',
      email: 'test@example.com',
      phone: null,
      googleSubject: null,
      passwordHash: 'hashed',
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rawToken = 'dummy-refresh-token-12345678901234567890';
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const mockSession: SessionRecord = {
      id: 'session-id-1',
      userId: mockUser.id,
      refreshTokenHash: hash,
      userAgent: 'Jest',
      ipAddress: '127.0.0.1',
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // +1h
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo = {
      findSessionByHash: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockSession),
      revokeSession: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockUser),
      createSession: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({} as any),
    } as unknown as AuthRepository;

    const mockJwt = {
      sign: jest.fn<(...args: any[]) => string>().mockReturnValue('mock-jwt-token'),
    } as unknown as JwtService;

    const service = new AuthService(mockRepo, mockJwt);
    const result = await service.refresh(rawToken, 'New UA', '127.0.0.2');

    expect(mockRepo.findSessionByHash).toHaveBeenCalledWith(hash);
    expect(mockRepo.revokeSession).toHaveBeenCalledWith('session-id-1', 'ROTATED');
    expect(mockRepo.createSession).toHaveBeenCalled();
    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('detects revoked token reuse and rejects with AUTH_SESSION_REVOKED', async () => {
    const rawToken = 'revoked-token-1234567890';
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const mockSession: SessionRecord = {
      id: 'session-id-revoked',
      userId: 'user-1',
      refreshTokenHash: hash,
      userAgent: null,
      ipAddress: null,
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: 'ROTATED',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo = {
      findSessionByHash: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockSession),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo, {} as JwtService);

    await expect(service.refresh(rawToken)).rejects.toMatchObject({
      response: {
        code: ErrorCode.AUTH_SESSION_REVOKED,
      },
    });
  });

  it('rejects expired session with AUTH_SESSION_EXPIRED', async () => {
    const rawToken = 'expired-token-1234567890';
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const mockSession: SessionRecord = {
      id: 'session-id-expired',
      userId: 'user-1',
      refreshTokenHash: hash,
      userAgent: null,
      ipAddress: null,
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo = {
      findSessionByHash: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockSession),
      revokeSession: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo, {} as JwtService);

    await expect(service.refresh(rawToken)).rejects.toMatchObject({
      response: {
        code: ErrorCode.AUTH_SESSION_EXPIRED,
      },
    });

    expect(mockRepo.revokeSession).toHaveBeenCalledWith('session-id-expired', 'EXPIRED');
  });

  it('revokes session with LOGOUT on logout', async () => {
    const rawToken = 'logout-token-1234567890';
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const mockSession: SessionRecord = {
      id: 'session-id-logout',
      userId: 'user-1',
      refreshTokenHash: hash,
      userAgent: null,
      ipAddress: null,
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo = {
      findSessionByHash: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockSession),
      revokeSession: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo, {} as JwtService);
    const result = await service.logout(rawToken);

    expect(result).toEqual({ ok: true });
    expect(mockRepo.revokeSession).toHaveBeenCalledWith('session-id-logout', 'LOGOUT');
  });

  it('updates user profile successfully', async () => {
    const mockUser: AuthUserRecord = {
      id: 'user-profile-1',
      fullName: 'Old Name',
      email: 'old@example.com',
      phone: '0901234567',
      googleSubject: null,
      passwordHash: 'hashed',
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedUser: AuthUserRecord = {
      ...mockUser,
      fullName: 'New Name',
      email: 'new@example.com',
      phone: '0909999999',
    };

    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockUser),
      findByContactExcludingUser: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue(undefined),
      updateUser: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(updatedUser),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo, {} as JwtService);
    const result = await service.updateProfile('user-profile-1', {
      fullName: 'New Name',
      email: 'new@example.com',
      phone: '0909999999',
    });

    expect(result.fullName).toBe('New Name');
    expect(result.email).toBe('new@example.com');
    expect(mockRepo.updateUser).toHaveBeenCalledWith('user-profile-1', {
      fullName: 'New Name',
      email: 'new@example.com',
      phone: '0909999999',
    });
  });

  it('rejects duplicate contact when updating profile', async () => {
    const mockUser: AuthUserRecord = {
      id: 'user-profile-1',
      fullName: 'Old Name',
      email: 'old@example.com',
      phone: '0901234567',
      googleSubject: null,
      passwordHash: 'hashed',
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const anotherUser: AuthUserRecord = {
      ...mockUser,
      id: 'user-profile-2',
      email: 'taken@example.com',
    };

    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(mockUser),
      findByContactExcludingUser: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue(anotherUser),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo, {} as JwtService);

    await expect(
      service.updateProfile('user-profile-1', { email: 'taken@example.com' }),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.AUTH_CONTACT_ALREADY_EXISTS },
    });
  });
});
