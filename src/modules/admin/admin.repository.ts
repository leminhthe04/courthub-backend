import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { sessions, users, type UserRole } from '../../database/schema';

@Injectable()
export class AdminRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  listUsers() {
    return this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserRole(id: string, role: UserRole) {
    const [user] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      });
    return user;
  }

  async findUser(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async countActiveAdmins() {
    const [result] = await this.db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true)));
    return Number(result?.count ?? 0);
  }

  async updateUserStatus(id: string, isActive: boolean) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          isActive: users.isActive,
        });

      if (!isActive) {
        await tx
          .update(sessions)
          .set({
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'REVOKED_BY_ADMIN',
            updatedAt: new Date(),
          })
          .where(and(eq(sessions.userId, id), eq(sessions.isRevoked, false)));
      }

      return user;
    });
  }
}
