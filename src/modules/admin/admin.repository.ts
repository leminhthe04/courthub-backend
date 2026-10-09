import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { users, type UserRole } from '../../database/schema';

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
      });
    return user;
  }
}
