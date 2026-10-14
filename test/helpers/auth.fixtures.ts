import type { AuthUserRecord } from '../../src/modules/auth/auth.repository';

export function createAuthUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: '0199a111-1111-7111-8111-111111111111',
    fullName: 'CourtHub User',
    email: 'user@example.com',
    phone: '0901234567',
    googleSubject: null,
    passwordHash: 'hashed-password',
    isActive: true,
    role: 'CUSTOMER',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
