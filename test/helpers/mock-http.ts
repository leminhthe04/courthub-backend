import { jest } from '@jest/globals';

export function mockResolved(value: any) {
  return jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);
}

export function createMockResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  } as any;
}

export function createAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    userId: '0199a111-1111-7111-8111-111111111111',
    role: 'CUSTOMER',
    email: 'user@example.com',
    phone: '0901234567',
    ...overrides,
  } as any;
}
