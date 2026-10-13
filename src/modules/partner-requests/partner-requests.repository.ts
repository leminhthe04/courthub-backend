import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  partnerRequests,
  users,
  type NewPartnerRequest,
  type PartnerRequestStatus,
} from '../../database/schema';

@Injectable()
export class PartnerRequestsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findByUserId(userId: string) {
    return this.db.query.partnerRequests.findFirst({
      where: eq(partnerRequests.userId, userId),
      orderBy: desc(partnerRequests.updatedAt),
    });
  }

  async create(values: NewPartnerRequest) {
    const [request] = await this.db.insert(partnerRequests).values(values).returning();
    return request;
  }

  async resubmit(id: string, message: string | null) {
    const [request] = await this.db
      .update(partnerRequests)
      .set({
        message,
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(partnerRequests.id, id))
      .returning();
    return request;
  }

  listAll() {
    return this.db
      .select({
        id: partnerRequests.id,
        userId: partnerRequests.userId,
        message: partnerRequests.message,
        status: partnerRequests.status,
        reviewedBy: partnerRequests.reviewedBy,
        reviewedAt: partnerRequests.reviewedAt,
        createdAt: partnerRequests.createdAt,
        updatedAt: partnerRequests.updatedAt,
        userName: users.fullName,
        userEmail: users.email,
        userPhone: users.phone,
        userIsActive: users.isActive,
        userRole: users.role,
      })
      .from(partnerRequests)
      .innerJoin(users, eq(users.id, partnerRequests.userId))
      .orderBy(asc(partnerRequests.status), desc(partnerRequests.updatedAt));
  }

  async review(id: string, status: PartnerRequestStatus, reviewerId: string) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(partnerRequests)
        .where(and(eq(partnerRequests.id, id), eq(partnerRequests.status, 'PENDING')))
        .limit(1);
      if (!current) return undefined;

      const now = new Date();
      const [request] = await tx
        .update(partnerRequests)
        .set({ status, reviewedBy: reviewerId, reviewedAt: now, updatedAt: now })
        .where(eq(partnerRequests.id, id))
        .returning();

      if (status === 'APPROVED') {
        await tx
          .update(users)
          .set({ role: 'PARTNER', updatedAt: now })
          .where(eq(users.id, current.userId));
      }

      return request;
    });
  }
}
