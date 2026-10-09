import { Inject, Injectable } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { users, type NewUser, type User } from '../../database/schema';

export type AuthUserRecord = User;

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
}
