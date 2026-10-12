import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ne, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  sessions,
  users,
  type NewSession,
  type NewUser,
  type Session,
  type SessionRevokeReason,
  type User,
} from '../../database/schema';

export type AuthUserRecord = User;
export type SessionRecord = Session;

@Injectable()
export class AuthRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByContact(
    email: string | null,
    phone: string | null,
  ): Promise<AuthUserRecord | undefined> {
    if (!email && !phone) return undefined;

    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (phone) conditions.push(eq(users.phone, phone));

    const [user] = await this.db
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);
    return user;
  }

  async findByContactExcludingUser(
    userId: string,
    email: string | null,
    phone: string | null,
  ): Promise<AuthUserRecord | undefined> {
    if (!email && !phone) return undefined;

    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (phone) conditions.push(eq(users.phone, phone));

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(ne(users.id, userId), or(...conditions)))
      .limit(1);
    return user;
  }

  async findByIdentifier(identifier: string): Promise<AuthUserRecord | undefined> {
    const normalizedPhone = identifier.replace(/[\s().-]/g, '');
    const condition = identifier.includes('@')
      ? eq(users.email, identifier.toLowerCase())
      : or(eq(users.phone, normalizedPhone), eq(users.email, identifier.toLowerCase()));
    const [user] = await this.db.select().from(users).where(condition).limit(1);
    return user;
  }

  async findById(userId: string): Promise<AuthUserRecord | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user;
  }

  async createCustomer(values: NewUser): Promise<AuthUserRecord> {
    const [user] = await this.db.insert(users).values(values).returning();
    return user;
  }

  async updateUser(userId: string, values: Partial<NewUser>): Promise<AuthUserRecord> {
    const [user] = await this.db
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createSession(values: NewSession): Promise<SessionRecord> {
    const [session] = await this.db.insert(sessions).values(values).returning();
    return session;
  }

  async findSessionByHash(refreshTokenHash: string): Promise<SessionRecord | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    return session;
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return session;
  }

  async updateSession(
    sessionId: string,
    values: Partial<NewSession>,
  ): Promise<SessionRecord | undefined> {
    const [updated] = await this.db
      .update(sessions)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();
    return updated;
  }

  async revokeSession(sessionId: string, reason: SessionRevokeReason): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }
}
