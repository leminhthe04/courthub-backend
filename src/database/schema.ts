import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Relational schema for CourtHub.

export const userRoleEnum = pgEnum('user_role', ['CUSTOMER', 'PARTNER', 'ADMIN']);
export const venueStatusEnum = pgEnum('venue_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'REJECTED',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('CUSTOMER'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_phone_unique').on(table.phone),
  ],
);

export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    sportType: varchar('sport_type', { length: 60 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    status: venueStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('venues_owner_id_idx').on(table.ownerId),
    index('venues_search_idx').on(table.status, table.city),
  ],
);

export const courts = pgTable(
  'courts',
  {
    id: uuid('id').primaryKey(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    hourlyRate: numeric('hourly_rate', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('courts_venue_id_idx').on(table.venueId)],
);

export const operatingHours = pgTable(
  'operating_hours',
  {
    id: uuid('id').primaryKey(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    openTime: time('open_time'),
    closeTime: time('close_time'),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (table) => [uniqueIndex('operating_hours_venue_day_unique').on(table.venueId, table.dayOfWeek)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    guestName: varchar('guest_name', { length: 120 }),
    contactPhone: varchar('contact_phone', { length: 32 }).notNull(),
    guestTokenHash: text('guest_token_hash'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: bookingStatusEnum('status').notNull().default('PENDING'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('bookings_court_time_idx').on(table.courtId, table.startAt, table.endAt),
    index('bookings_customer_idx').on(table.customerId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
export type OperatingHours = typeof operatingHours.$inferSelect;
export type NewOperatingHours = typeof operatingHours.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type UserRole = 'CUSTOMER' | 'PARTNER' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';
