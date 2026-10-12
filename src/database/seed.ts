import 'dotenv/config';
import { hash } from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createUuidV7 } from '../common/uuid';
import * as schema from './schema';
import { EnvConfig } from '../config/env-config';

// Demo data for local development.

async function seed() {
  const config = new EnvConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });
  const passwordHash = await hash('courthub@123', 10);
  const customerId = createUuidV7();
  const partnerId = createUuidV7();
  const adminId = createUuidV7();
  const venueId = createUuidV7();
  const badmintonCategoryId = createUuidV7();

  await db.insert(schema.categories).values([
    {
      id: badmintonCategoryId,
      name: 'Cầu lông',
      slug: 'badminton',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Tennis',
      slug: 'tennis',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Bóng đá',
      slug: 'football',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Bóng rổ',
      slug: 'basketball',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Pickleball',
      slug: 'pickleball',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Bóng bàn',
      slug: 'table-tennis',
      isActive: true,
    },
  ]);

  await db.insert(schema.users).values([
    {
      id: customerId,
      fullName: 'Demo Customer',
      email: 'customer@example.com',
      phone: '+84900000001',
      passwordHash,
      role: 'CUSTOMER',
    },
    {
      id: partnerId,
      fullName: 'Demo Partner',
      email: 'partner@example.com',
      phone: '+84900000002',
      passwordHash,
      role: 'PARTNER',
    },
    {
      id: adminId,
      fullName: 'Demo Admin',
      email: 'admin@example.com',
      phone: '+84900000003',
      passwordHash,
      role: 'ADMIN',
    },
  ]);
  await db.insert(schema.venues).values({
    id: venueId,
    ownerId: partnerId,
    categoryId: badmintonCategoryId,
    name: 'CourtHub District 1',
    address: '12 Nguyen Hue',
    city: 'Ho Chi Minh City',
    description: 'Demo venue for CourtHub booking flow.',
    status: 'APPROVED',
  });
  await db.insert(schema.courts).values([
    { id: createUuidV7(), venueId, name: 'Court 1' },
    { id: createUuidV7(), venueId, name: 'Court 2' },
    { id: createUuidV7(), venueId, name: 'Court 3' },
  ]);
  await db.insert(schema.venuePricingRules).values([
    {
      id: createUuidV7(),
      venueId,
      startTime: '05:00',
      endTime: '13:00',
      hourlyRate: 150000,
    },
    {
      id: createUuidV7(),
      venueId,
      startTime: '15:00',
      endTime: '22:00',
      hourlyRate: 200000,
    },
  ]);
  await db.insert(schema.operatingHours).values(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      id: createUuidV7(),
      venueId,
      dayOfWeek,
      openTime: '06:00',
      closeTime: '23:00',
      isClosed: false,
    })),
  );
  await pool.end();
  console.log('CourtHub seed completed.');
}

void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
