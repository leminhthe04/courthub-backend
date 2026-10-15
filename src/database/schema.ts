import {
  boolean,
  index,
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
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'REJECTED',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
]);
export const sessionRevokeReasonEnum = pgEnum('session_revoke_reason', [
  'LOGOUT',
  'ROTATED',
  'EXPIRED',
  'REVOKED_BY_ADMIN',
]);
export const partnerRequestStatusEnum = pgEnum('partner_request_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    googleSubject: varchar('google_subject', { length: 255 }),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('CUSTOMER'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_phone_unique').on(table.phone),
    uniqueIndex('users_google_subject_unique').on(table.googleSubject),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('categories_slug_unique').on(table.slug),
    index('categories_is_active_idx').on(table.isActive),
  ],
);

export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 160 }).notNull(),
    address: varchar('address', { length: 255 }).notNull(),
    ward: varchar('ward', { length: 150 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    wardCode: varchar('ward_code', { length: 20 }).notNull(),
    provinceCode: varchar('province_code', { length: 20 }).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    status: venueStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('venues_owner_id_idx').on(table.ownerId),
    index('venues_category_id_idx').on(table.categoryId),
    index('venues_search_idx').on(table.status, table.province),
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
    isActive: boolean('is_active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('courts_venue_id_idx').on(table.venueId)],
);

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
]);

export const venuePricingRules = pgTable(
  'venue_pricing_rules',
  {
    id: uuid('id').primaryKey(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    hourlyRate: numeric('hourly_rate', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('venue_pricing_rules_venue_day_idx').on(table.venueId, table.dayOfWeek, table.startTime),
  ],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    contactName: varchar('contact_name', { length: 120 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 32 }).notNull(),
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

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    payosOrderCode: varchar('payos_order_code', { length: 32 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    status: paymentStatusEnum('status').notNull().default('PENDING'),
    checkoutUrl: text('checkout_url').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('payments_booking_unique').on(table.bookingId),
    uniqueIndex('payments_payos_order_code_unique').on(table.payosOrderCode),
    index('payments_status_expires_idx').on(table.status, table.expiresAt),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    isRevoked: boolean('is_revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: sessionRevokeReasonEnum('revoked_reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_token_hash_idx').on(table.refreshTokenHash),
  ],
);

export const partnerRequests = pgTable(
  'partner_requests',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message'),
    status: partnerRequestStatusEnum('status').notNull().default('PENDING'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('partner_requests_user_unique').on(table.userId),
    index('partner_requests_status_idx').on(table.status, table.createdAt),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_hash_unique').on(table.tokenHash),
    index('password_reset_tokens_user_idx').on(table.userId),
    index('password_reset_tokens_expires_idx').on(table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;
export type VenuePricingRule = typeof venuePricingRules.$inferSelect;
export type NewVenuePricingRule = typeof venuePricingRules.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type NewPartnerRequest = typeof partnerRequests.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type UserRole = 'CUSTOMER' | 'PARTNER' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
export type SessionRevokeReason = 'LOGOUT' | 'ROTATED' | 'EXPIRED' | 'REVOKED_BY_ADMIN';
export type PartnerRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DayOfWeek = (typeof dayOfWeekEnum.enumValues)[number];
