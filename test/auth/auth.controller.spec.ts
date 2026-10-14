import { describe, expect, it, jest } from '@jest/globals';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { createAuthUser, createMockResponse, mockResolved } from '../helpers/mock-http';

describe('AuthController', () => {
  it('delegates public authentication endpoints and writes auth cookies', async () => {
    const auth: any = {
      register: mockResolved({ accessToken: 'a', refreshToken: 'r', user: {} }),
      login: mockResolved({ accessToken: 'a', refreshToken: 'r', user: {} }),
      refresh: mockResolved({ accessToken: 'a2', refreshToken: 'r2', user: {} }),
      logout: mockResolved({ ok: true }),
      getMe: mockResolved({ id: 'u1' }),
      updateProfile: mockResolved({ id: 'u1' }),
      requestPasswordReset: mockResolved({ ok: true }),
      requestPasswordResetForUser: mockResolved({ ok: true }),
      confirmPasswordReset: mockResolved({ ok: true }),
      loginWithGoogle: jest.fn(),
    };
    const config = { frontendUrls: ['http://localhost:3000'] };
    const controller = new AuthController(auth as any, config as any);
    const response = createMockResponse();
    const request = { headers: { 'user-agent': 'Jest' }, ip: '127.0.0.1', cookies: {} } as any;

    await expect(
      controller.register({ email: 'a@example.com' } as any, request, response),
    ).resolves.toEqual({ user: {} });
    await expect(
      controller.login({ identifier: 'a@example.com' } as any, request, response),
    ).resolves.toEqual({ user: {} });
    expect(response.cookie).toHaveBeenCalled();
    expect(auth.register).toHaveBeenCalledWith({ email: 'a@example.com' }, 'Jest', '127.0.0.1');
    expect(auth.login).toHaveBeenCalledWith({ identifier: 'a@example.com' }, 'Jest', '127.0.0.1');
  });

  it('delegates session, profile, and password reset operations', async () => {
    const auth: any = {
      refresh: mockResolved({ accessToken: 'a', refreshToken: 'r', user: {} }),
      logout: mockResolved({ ok: true }),
      getMe: mockResolved({ id: 'u1' }),
      updateProfile: mockResolved({ id: 'u1' }),
      requestPasswordReset: mockResolved({ ok: true }),
      requestPasswordResetForUser: mockResolved({ ok: true }),
      confirmPasswordReset: mockResolved({ ok: true }),
    };
    const controller = new AuthController(
      auth as any,
      { frontendUrls: ['http://localhost:3000'] } as any,
    );
    const response = createMockResponse();
    const user = createAuthUser();

    await controller.refresh(
      { cookies: { refresh_token: 'refresh' }, headers: {}, ip: '127.0.0.1' } as any,
      response,
    );
    await controller.logout({ cookies: { refresh_token: 'refresh' } } as any, response);
    await expect(controller.me(user)).resolves.toEqual({ user: { id: 'u1' } });
    await expect(controller.updateProfile(user, { fullName: 'Updated' } as any)).resolves.toEqual({
      user: { id: 'u1' },
    });
    await expect(
      controller.requestPasswordReset({ email: 'a@example.com' } as any),
    ).resolves.toEqual({ ok: true });
    await expect(controller.requestPasswordResetForUser(user)).resolves.toEqual({ ok: true });
    await expect(
      controller.confirmPasswordReset({ token: 't', newPassword: 'Password123!' } as any),
    ).resolves.toEqual({ ok: true });

    expect(auth.refresh).toHaveBeenCalledWith('refresh', undefined, '127.0.0.1');
    expect(auth.logout).toHaveBeenCalledWith('refresh');
    expect(auth.getMe).toHaveBeenCalledWith(user.userId);
    expect(auth.updateProfile).toHaveBeenCalledWith(user.userId, { fullName: 'Updated' });
  });
});
