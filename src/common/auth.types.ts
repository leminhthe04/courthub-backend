import type { UserRole } from '../database/schema';

export type AuthUser = {
  userId: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  fullName?: string;
};

export type JwtPayload = {
  sub: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
};
