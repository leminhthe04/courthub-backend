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
  const pickleballCategoryId = createUuidV7();

  await db.insert(schema.categories).values([
    {
      id: badmintonCategoryId,
      name: 'Badminton',
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
      name: 'Football',
      slug: 'football',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Basketball',
      slug: 'basketball',
      isActive: true,
    },
    {
      id: pickleballCategoryId,
      name: 'Pickleball',
      slug: 'pickleball',
      isActive: true,
    },
    {
      id: createUuidV7(),
      name: 'Table Tennis',
      slug: 'table-tennis',
      isActive: true,
    },
  ]);

  await db.insert(schema.users).values([
    {
      id: customerId,
      fullName: 'Trần Văn Nguyễn',
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
      fullName: 'Admin',
      email: 'admin@example.com',
      phone: '+84900000003',
      passwordHash,
      role: 'ADMIN',
    },
  ]);
  await db.insert(schema.venues).values({
    id: venueId,
    ownerId: partnerId,
    categoryId: pickleballCategoryId,
    name: 'Relaxar',
    address: '122A Tân Quới Hưng, Long Châu',
    city: 'Vĩnh Long',
    description: '',
    status: 'APPROVED',
  });

  await db.insert(schema.courts).values([
    { id: createUuidV7(), venueId, name: 'Sân 1' },
    { id: createUuidV7(), venueId, name: 'Sân 2' },
    { id: createUuidV7(), venueId, name: 'Sân 3' },
  ]);

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
  await db.insert(schema.venuePricingRules).values(
    days.flatMap((dayOfWeek) => [
      {
        id: createUuidV7(),
        venueId,
        dayOfWeek,
        startTime: '05:00',
        endTime: '11:00',
        hourlyRate: 150000,
      },
      {
        id: createUuidV7(),
        venueId,
        dayOfWeek,
        startTime: '13:00',
        endTime: '20:00',
        hourlyRate: 200000,
      },
    ]),
  );
  await pool.end();
  console.log('CourtHub seed completed.');
}

void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
