import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { bookings, courts, payments, venues, type NewPayment } from '../../database/schema';

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(values: NewPayment) {
    const [payment] = await this.db.insert(payments).values(values).returning();
    return payment;
  }

  async findById(id: string) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return payment;
  }

  async findPaymentDetails(id: string) {
    const [row] = await this.db
      .select({
        payment: payments,
        bookingId: bookings.id,
        bookingStatus: bookings.status,
        contactName: bookings.contactName,
        contactEmail: bookings.contactEmail,
        contactPhone: bookings.contactPhone,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        bookingCreatedAt: bookings.createdAt,
        courtId: courts.id,
        courtName: courts.name,
        venueId: venues.id,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(eq(payments.id, id))
      .limit(1);
    return row;
  }

  async findByBookingId(bookingId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .limit(1);
    return payment;
  }

  async findPendingForCustomer(paymentId: string, customerId: string) {
    const [row] = await this.db
      .select({ payment: payments, bookingStatus: bookings.status })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(and(eq(payments.id, paymentId), eq(bookings.customerId, customerId)))
      .limit(1);
    return row;
  }

  async cancelPending(paymentId: string) {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update')
        .limit(1);

      if (!payment) return undefined;
      if (payment.status !== 'PENDING') return { payment, changed: false };

      const now = new Date();
      const [updatedPayment] = await tx
        .update(payments)
        .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
        .where(eq(payments.id, payment.id))
        .returning();
      await tx
        .update(bookings)
        .set({ status: 'CANCELLED', updatedAt: now })
        .where(eq(bookings.id, payment.bookingId));

      return { payment: updatedPayment, changed: true };
    });
  }

  async applyWebhook(orderCode: string, amount: number, paid: boolean) {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.payosOrderCode, orderCode))
        .for('update')
        .limit(1);

      if (!payment || Number(payment.amount) !== amount) return undefined;
      if (
        payment.status === 'PAID' ||
        payment.status === 'CANCELLED' ||
        payment.status === 'EXPIRED'
      ) {
        return payment;
      }

      const now = new Date();
      const nextPaymentStatus = paid ? 'PAID' : 'CANCELLED';
      const nextBookingStatus = paid ? 'CONFIRMED' : 'CANCELLED';
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: nextPaymentStatus,
          paidAt: paid ? now : null,
          cancelledAt: paid ? null : now,
          updatedAt: now,
        })
        .where(eq(payments.id, payment.id))
        .returning();
      await tx
        .update(bookings)
        .set({ status: nextBookingStatus, updatedAt: now })
        .where(eq(bookings.id, payment.bookingId));
      return updatedPayment;
    });
  }

  async expireDue() {
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const due = await tx
        .select({ id: payments.id, bookingId: payments.bookingId })
        .from(payments)
        .where(and(eq(payments.status, 'PENDING'), lte(payments.expiresAt, now)))
        .for('update');
      if (!due.length) return 0;

      const ids = due.map((payment) => payment.id);
      const bookingIds = due.map((payment) => payment.bookingId);
      await tx
        .update(payments)
        .set({ status: 'EXPIRED', cancelledAt: now, updatedAt: now })
        .where(inArray(payments.id, ids));
      await tx
        .update(bookings)
        .set({ status: 'CANCELLED', updatedAt: now })
        .where(inArray(bookings.id, bookingIds));
      return due.length;
    });
  }
}
