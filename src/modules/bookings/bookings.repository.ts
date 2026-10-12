import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  bookings,
  courts,
  operatingHours,
  venuePricingRules,
  venues,
  type Booking,
  type NewBooking,
} from '../../database/schema';

export type BookingRecord = Booking;
export type BookingTransitionRecord = { booking: Booking; ownerId: string };

@Injectable()
export class BookingsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findCourtForBooking(courtId: string) {
    const [court] = await this.db
      .select({
        id: courts.id,
        venueId: venues.id,
        courtActive: courts.isActive,
        venueStatus: venues.status,
      })
      .from(courts)
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(eq(courts.id, courtId))
      .limit(1);
    return court;
  }

  async findPricingRules(venueId: string) {
    return this.db
      .select()
      .from(venuePricingRules)
      .where(eq(venuePricingRules.venueId, venueId))
      .orderBy(asc(venuePricingRules.startTime));
  }

  async findOperatingHours(venueId: string, dayOfWeek: number) {
    const [hours] = await this.db
      .select()
      .from(operatingHours)
      .where(and(eq(operatingHours.venueId, venueId), eq(operatingHours.dayOfWeek, dayOfWeek)))
      .limit(1);
    return hours;
  }

  async create(values: NewBooking): Promise<BookingRecord> {
    const [booking] = await this.db.transaction((tx) =>
      tx.insert(bookings).values(values).returning(),
    );
    return booking;
  }

  async findById(id: string): Promise<BookingRecord | undefined> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return booking;
  }

  listMine(userId: string) {
    return this.db
      .select({
        id: bookings.id,
        courtId: bookings.courtId,
        courtName: courts.name,
        venueId: venues.id,
        venueName: venues.name,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(eq(bookings.customerId, userId))
      .orderBy(desc(bookings.startAt));
  }

  async cancel(id: string): Promise<BookingRecord | undefined> {
    const [booking] = await this.db
      .update(bookings)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  listForPartner(userId: string) {
    return this.db
      .select({
        id: bookings.id,
        courtId: courts.id,
        courtName: courts.name,
        venueId: venues.id,
        venueName: venues.name,
        customerId: bookings.customerId,
        guestName: bookings.guestName,
        contactPhone: bookings.contactPhone,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(eq(venues.ownerId, userId))
      .orderBy(desc(bookings.startAt));
  }

  async findForTransition(id: string): Promise<BookingTransitionRecord | undefined> {
    const [row] = await this.db
      .select({ booking: bookings, ownerId: venues.ownerId })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(eq(bookings.id, id))
      .limit(1);
    return row;
  }

  async transition(
    id: string,
    status: 'CONFIRMED' | 'REJECTED',
  ): Promise<BookingRecord | undefined> {
    const [booking] = await this.db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  listForAdmin() {
    return this.db
      .select({
        id: bookings.id,
        venueName: venues.name,
        courtName: courts.name,
        guestName: bookings.guestName,
        contactPhone: bookings.contactPhone,
        customerId: bookings.customerId,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .innerJoin(courts, eq(courts.id, bookings.courtId))
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .orderBy(desc(bookings.createdAt));
  }
}
