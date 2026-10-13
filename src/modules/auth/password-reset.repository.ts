import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  passwordResetTokens,
  sessions,
  users,
  type NewPasswordResetToken,
  type PasswordResetToken,
} from '../../database/schema';

@Injectable()
export class PasswordResetRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async revokeActiveForUser(userId: string, now = new Date()): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          isNull(passwordResetTokens.revokedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );
  }

  async create(values: NewPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await this.db.insert(passwordResetTokens).values(values).returning();
    return token;
  }

  async findValidByHash(
    tokenHash: string,
    now = new Date(),
  ): Promise<PasswordResetToken | undefined> {
    const [token] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          isNull(passwordResetTokens.revokedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return token;
  }

  async consumeAndResetPassword(
    tokenId: string,
    userId: string,
    passwordHash: string,
    now = new Date(),
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [usedToken] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.id, tokenId),
            eq(passwordResetTokens.userId, userId),
            isNull(passwordResetTokens.usedAt),
            isNull(passwordResetTokens.revokedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ id: passwordResetTokens.id });

      if (!usedToken) return false;

      await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, userId));
      await tx
        .update(sessions)
        .set({
          isRevoked: true,
          revokedAt: now,
          revokedReason: 'REVOKED_BY_ADMIN',
          updatedAt: now,
        })
        .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)));

      return true;
    });
  }
}
