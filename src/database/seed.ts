import 'dotenv/config';
import { hash } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createUuidV7 } from '../common/uuid';
import { EnvConfig } from '../config/env-config';
import * as schema from './schema';

const DEFAULT_PASSWORD = 'courthub@123';
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const categoryDefinitions = [
  { name: 'Badminton', slug: 'badminton' },
  { name: 'Tennis', slug: 'tennis' },
  { name: 'Football', slug: 'football' },
  { name: 'Basketball', slug: 'basketball' },
  { name: 'Pickleball', slug: 'pickleball' },
  { name: 'Table Tennis', slug: 'table-tennis' },
] as const;

const partnerDefinitions = [
  {
    fullName: 'Partner 001 - Nguyễn Minh Quân',
    email: 'partner01@example.com',
    phone: '+84910000001',
    venues: [
      [
        'Saigon Smash Arena',
        '18 Nguyễn Cửu Vân, Phường 17, Bình Thạnh',
        'Ho Chi Minh City',
        'badminton',
      ],
    ],
  },
  {
    fullName: 'Partner 002 - Trần Thảo Vy',
    email: 'partner02@example.com',
    phone: '+84910000002',
    venues: [
      ['Tây Hồ Tennis House', '12 Xuân Diệu, Quảng An, Tây Hồ', 'Hanoi', 'tennis'],
      ['Long Biên Football Park', '86 Nguyễn Văn Cừ, Bồ Đề, Long Biên', 'Hanoi', 'football'],
    ],
  },
  {
    fullName: 'Partner 003 - Lê Hoàng Nam',
    email: 'partner03@example.com',
    phone: '+84910000003',
    venues: [
      [
        'Sơn Trà Pickleball Garden',
        '35 Ngô Quyền, Phường Thọ Quang, Sơn Trà',
        'Da Nang',
        'pickleball',
      ],
      ['Hải Châu Basketball Center', '102 Lê Đình Dương, Phường Hải Châu', 'Da Nang', 'basketball'],
      [
        'Nguyễn Tất Thành Table Tennis Club',
        '214 Nguyễn Tất Thành, Phường Thanh Bình',
        'Da Nang',
        'table-tennis',
      ],
    ],
  },
  {
    fullName: 'Partner 004 - Phạm Ngọc Anh',
    email: 'partner04@example.com',
    phone: '+84910000004',
    venues: [
      [
        'Ninh Kiều Shuttlecourt',
        '27 Mậu Thân, Phường Xuân Khánh, Ninh Kiều',
        'Can Tho',
        'badminton',
      ],
      ['Cái Khế Tennis Club', '7 Lê Lợi, Phường Cái Khế, Ninh Kiều', 'Can Tho', 'tennis'],
      [
        'Hưng Lợi Football Field',
        '91 Nguyễn Văn Linh, Phường Hưng Lợi, Ninh Kiều',
        'Can Tho',
        'football',
      ],
      [
        'Cần Thơ Pickleball House',
        '44 Võ Văn Kiệt, Phường An Hòa, Ninh Kiều',
        'Can Tho',
        'pickleball',
      ],
    ],
  },
  {
    fullName: 'Partner 005 - Võ Đức Huy',
    email: 'partner05@example.com',
    phone: '+84910000005',
    venues: [
      ['Lạch Tray Tennis Garden', '88 Lạch Tray, Đổng Quốc Bình, Ngô Quyền', 'Hai Phong', 'tennis'],
      [
        'Hồng Bàng Basketball Hall',
        '15 Hoàng Văn Thụ, Phường Minh Khai, Hồng Bàng',
        'Hai Phong',
        'basketball',
      ],
      ['Cầu Rào Football Complex', '23 Võ Nguyên Giáp, Đằng Hải, Hải An', 'Hai Phong', 'football'],
      ['Đồ Sơn Pickleball Club', '6 Lý Thánh Tông, Vạn Sơn, Đồ Sơn', 'Hai Phong', 'pickleball'],
      ['Ngô Quyền Smash Club', '41 Văn Cao, Đằng Giang, Ngô Quyền', 'Hai Phong', 'badminton'],
    ],
  },
  {
    fullName: 'Partner 006 - Đặng Mai Linh',
    email: 'partner06@example.com',
    phone: '+84910000006',
    venues: [
      ['Nha Trang Beach Pickleball', '9 Phạm Văn Đồng, Vĩnh Hải', 'Nha Trang', 'pickleball'],
    ],
  },
  {
    fullName: 'Partner 007 - Bùi Quốc Bảo',
    email: 'partner07@example.com',
    phone: '+84910000007',
    venues: [
      ['Huế Riverside Badminton', '28 Chi Lăng, Phường Gia Hội', 'Hue', 'badminton'],
      ['An Cựu Tennis Court', '76 An Dương Vương, Phường An Cựu', 'Hue', 'tennis'],
    ],
  },
  {
    fullName: 'Partner 008 - Hồ Gia Hân',
    email: 'partner08@example.com',
    phone: '+84910000008',
    venues: [
      ['Bãi Sau Football Hub', '2 Thùy Vân, Phường Thắng Tam', 'Vung Tau', 'football'],
      ['Vũng Tàu Paddle Club', '19 Hoàng Hoa Thám, Phường 2', 'Vung Tau', 'pickleball'],
      ['Lê Hồng Phong Table Tennis', '63 Lê Hồng Phong, Phường 7', 'Vung Tau', 'table-tennis'],
    ],
  },
  {
    fullName: 'Partner 009 - Nguyễn Tuấn Kiệt',
    email: 'partner09@example.com',
    phone: '+84910000009',
    venues: [
      ['Thủ Dầu Một Smash Center', '38 Yersin, Phú Cường', 'Thu Dau Mot', 'badminton'],
      ['Bình Dương Tennis Park', '121 Đại lộ Bình Dương, Phú Hòa', 'Thu Dau Mot', 'tennis'],
      ['Phú Lợi Basketball Court', '17 Phú Lợi, Phú Hòa', 'Thu Dau Mot', 'basketball'],
      ['Tân Uyên Football Arena', '52 ĐT747, Uyên Hưng', 'Tan Uyen', 'football'],
    ],
  },
  {
    fullName: 'Partner 010 - Trương Khánh An',
    email: 'partner10@example.com',
    phone: '+84910000010',
    venues: [
      ['Vĩnh Long Riverside Tennis', '10 Phạm Thái Bường, Phường 4', 'Vinh Long', 'tennis'],
      ['Long Hồ Badminton Club', '45 Quốc lộ 53, Thị trấn Long Hồ', 'Vinh Long', 'badminton'],
      ['Phường 1 Basketball House', '22 Tống Phước Hiệp, Phường 1', 'Vinh Long', 'basketball'],
      ['Mekong Pickleball Garden', '78 Nguyễn Văn Thiệt, Phường 3', 'Vinh Long', 'pickleball'],
      ['Vĩnh Long Table Tennis Hall', '31 2 Tháng 9, Phường 1', 'Vinh Long', 'table-tennis'],
    ],
  },
] as const;

const hourlyRateByCategory: Record<string, number> = {
  badminton: 120000,
  tennis: 180000,
  football: 450000,
  basketball: 300000,
  pickleball: 160000,
  'table-tennis': 100000,
};

const pricingSlots = [
  { startTime: '05:00', endTime: '08:00', multiplier: 0.8 },
  { startTime: '08:00', endTime: '12:00', multiplier: 1 },
  { startTime: '13:00', endTime: '17:00', multiplier: 1.1 },
  { startTime: '17:00', endTime: '22:00', multiplier: 1.35 },
] as const;

type SeedDatabase = Pick<NodePgDatabase<typeof schema>, 'select' | 'insert'>;
type SeedVenueValues = Omit<schema.NewVenue, 'ward' | 'wardCode' | 'provinceCode'>;
type LocationProvince = { code: string; name: string };
type LocationWard = { code: string; name: string; type: string };

const locationApi = 'https://www.tinhthanhpho.com/api/v1';
let seedProvinces: LocationProvince[] | undefined;
const seedWards = new Map<string, LocationWard[]>();
const normalizeLocation = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const provinceAliases: Record<string, string> = {
  'ho chi minh city': 'ho chi minh',
  saigon: 'ho chi minh',
  hanoi: 'ha noi',
  'nha trang': 'khanh hoa',
  'vung tau': 'ho chi minh',
  'thu dau mot': 'ho chi minh',
  'tan uyen': 'ho chi minh',
  hue: 'hue',
};
const seedLocationOverrides: Record<
  string,
  { ward: string; wardCode: string; province: string; provinceCode: string }
> = {
  '214 nguyen tat thanh phuong thanh binh': {
    ward: 'Phường Hải Châu',
    wardCode: '20242',
    province: 'Đà Nẵng',
    provinceCode: '48',
  },
  '28 chi lang phuong gia hoi': {
    ward: 'Phường Phú Xuân',
    wardCode: '19753',
    province: 'Huế',
    provinceCode: '46',
  },
  '2 thuy van phuong thang tam': {
    ward: 'Phường Tam Thắng',
    wardCode: '26526',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '19 hoang hoa tham phuong 2': {
    ward: 'Phường Vũng Tàu',
    wardCode: '26506',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '63 le hong phong phuong 7': {
    ward: 'Phường Vũng Tàu',
    wardCode: '26506',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '38 yersin phu cuong': {
    ward: 'Phường Thủ Dầu Một',
    wardCode: '25747',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '121 dai lo binh duong phu hoa': {
    ward: 'Phường Thủ Dầu Một',
    wardCode: '25747',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '17 phu loi phu hoa': {
    ward: 'Phường Phú Lợi',
    wardCode: '25750',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '52 dt747 uyen hung': {
    ward: 'Phường Tân Uyên',
    wardCode: '25888',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  '10 pham thai buong phuong 4': {
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  '45 quoc lo 53 thi tran long ho': {
    ward: 'Xã Long Hồ',
    wardCode: '29602',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  '22 tong phuoc hiep phuong 1': {
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  '78 nguyen van thiet phuong 3': {
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  '31 2 thang 9 phuong 1': {
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
};

async function resolveSeedLocation(provinceValue: string, address: string) {
  const override = seedLocationOverrides[normalizeLocation(address)];
  if (override) return override;
  if (!seedProvinces) {
    const response = await fetch(`${locationApi}/new-provinces?limit=100&page=1`);
    seedProvinces = ((await response.json()) as { data: LocationProvince[] }).data;
  }
  const provinceKey =
    provinceAliases[normalizeLocation(provinceValue)] ?? normalizeLocation(provinceValue);
  const province = seedProvinces.find((item) => normalizeLocation(item.name).includes(provinceKey));
  if (!province) throw new Error(`Unable to resolve seed province: ${provinceValue}`);
  let wards = seedWards.get(province.code);
  if (!wards) {
    const response = await fetch(
      `${locationApi}/new-provinces/${province.code}/wards?limit=500&page=1`,
    );
    wards = ((await response.json()) as { data: LocationWard[] }).data;
    seedWards.set(province.code, wards);
  }
  const parts = address.split(',').map((part) => part.trim());
  const index = parts.findIndex((part) =>
    wards!.some(
      (ward) =>
        normalizeLocation(part) === normalizeLocation(ward.name) ||
        normalizeLocation(part) === normalizeLocation(`${ward.type} ${ward.name}`),
    ),
  );
  const ward =
    index >= 0
      ? wards.find(
          (item) =>
            normalizeLocation(parts[index]) === normalizeLocation(item.name) ||
            normalizeLocation(parts[index]) === normalizeLocation(`${item.type} ${item.name}`),
        )
      : undefined;
  if (!ward) throw new Error(`Unable to resolve seed ward: ${address}`);
  return {
    address: parts.slice(0, index).join(', '),
    ward: `${ward.type} ${ward.name}`,
    wardCode: ward.code,
    province: province.name,
    provinceCode: province.code,
  };
}

async function findOrCreateCategory(
  db: SeedDatabase,
  definition: (typeof categoryDefinitions)[number],
) {
  const [existing] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, definition.slug))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(schema.categories)
    .values({ id: createUuidV7(), ...definition, isActive: true })
    .returning();
  return created;
}

async function findOrCreateUser(db: SeedDatabase, values: schema.NewUser) {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, values.email))
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(schema.users).values(values).returning();
  return created;
}

async function findOrCreateVenue(db: SeedDatabase, values: SeedVenueValues) {
  const [existing] = await db
    .select()
    .from(schema.venues)
    .where(and(eq(schema.venues.ownerId, values.ownerId), eq(schema.venues.name, values.name)))
    .limit(1);

  if (existing) return existing;

  const location = await resolveSeedLocation(values.province, values.address);
  const [created] = await db
    .insert(schema.venues)
    .values({ ...values, ...location })
    .returning();
  return created;
}

async function findOrCreateCourt(db: SeedDatabase, values: schema.NewCourt) {
  const [existing] = await db
    .select()
    .from(schema.courts)
    .where(and(eq(schema.courts.venueId, values.venueId), eq(schema.courts.name, values.name)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(schema.courts).values(values).returning();
  return created;
}

async function findOrCreatePricingRule(db: SeedDatabase, values: schema.NewVenuePricingRule) {
  const [existing] = await db
    .select()
    .from(schema.venuePricingRules)
    .where(
      and(
        eq(schema.venuePricingRules.venueId, values.venueId),
        eq(schema.venuePricingRules.dayOfWeek, values.dayOfWeek),
        eq(schema.venuePricingRules.startTime, values.startTime),
        eq(schema.venuePricingRules.endTime, values.endTime),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db.insert(schema.venuePricingRules).values(values).returning();
  return created;
}

async function seedPricingRules(
  db: SeedDatabase,
  venueId: string,
  categorySlug: string,
  venueIndex: number,
) {
  const baseRate = hourlyRateByCategory[categorySlug] ?? 150000;
  const slotCount = 2 + (venueIndex % pricingSlots.length);

  for (const dayOfWeek of DAYS) {
    const dayMultiplier =
      dayOfWeek === 'SAT' || dayOfWeek === 'SUN' ? 1.2 : dayOfWeek === 'FRI' ? 1.1 : 1;

    for (const slot of pricingSlots.slice(0, slotCount)) {
      const hourlyRate = Math.round(baseRate * slot.multiplier * dayMultiplier) + venueIndex * 5000;
      await findOrCreatePricingRule(db, {
        id: createUuidV7(),
        venueId,
        dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hourlyRate,
      });
    }
  }
}

async function seed() {
  const config = new EnvConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const passwordHash = await hash(DEFAULT_PASSWORD, 10);

    await db.transaction(async (tx) => {
      const categories = new Map<string, schema.Category>();
      for (const definition of categoryDefinitions) {
        categories.set(definition.slug, await findOrCreateCategory(tx, definition));
      }

      await findOrCreateUser(tx, {
        id: createUuidV7(),
        fullName: 'Trần Văn Nguyễn',
        email: 'customer@example.com',
        phone: '+84900000001',
        passwordHash,
        role: 'CUSTOMER',
      });

      const basePartner = await findOrCreateUser(tx, {
        id: createUuidV7(),
        fullName: 'Partner Nguyễn Hoàng Long',
        email: 'partner@example.com',
        phone: '+84900000002',
        passwordHash,
        role: 'PARTNER',
      });

      await findOrCreateUser(tx, {
        id: createUuidV7(),
        fullName: 'Admin',
        email: 'admin@example.com',
        phone: '+84900000003',
        passwordHash,
        role: 'ADMIN',
      });

      const baseVenue = await findOrCreateVenue(tx, {
        id: createUuidV7(),
        ownerId: basePartner.id,
        categoryId: categories.get('pickleball')!.id,
        name: 'Relaxar',
        address: '122A Tân Quới Hưng, Phường Long Châu',
        province: 'Vĩnh Long',
        description: 'Pickleball courts near the city centre.',
        status: 'APPROVED',
      });
      for (let courtIndex = 1; courtIndex <= 3; courtIndex += 1) {
        await findOrCreateCourt(tx, {
          id: createUuidV7(),
          venueId: baseVenue.id,
          name: `Sân ${courtIndex}`,
        });
      }
      await seedPricingRules(tx, baseVenue.id, 'pickleball', 0);

      for (let partnerIndex = 0; partnerIndex < partnerDefinitions.length; partnerIndex += 1) {
        const definition = partnerDefinitions[partnerIndex];
        const partner = await findOrCreateUser(tx, {
          id: createUuidV7(),
          fullName: definition.fullName,
          email: definition.email,
          phone: definition.phone,
          passwordHash,
          role: 'PARTNER',
        });

        for (let venueIndex = 0; venueIndex < definition.venues.length; venueIndex += 1) {
          const [name, address, province, categorySlug] = definition.venues[venueIndex];
          const category = categories.get(categorySlug);
          if (!category) throw new Error(`Missing category: ${categorySlug}`);

          const venue = await findOrCreateVenue(tx, {
            id: createUuidV7(),
            ownerId: partner.id,
            categoryId: category.id,
            name,
            address,
            province,
            description: `${name} offers bookable ${category.name.toLowerCase()} facilities.`,
            status: 'APPROVED',
          });

          const courtCount = 2 + ((partnerIndex * 2 + venueIndex) % 9);
          for (let courtIndex = 1; courtIndex <= courtCount; courtIndex += 1) {
            await findOrCreateCourt(tx, {
              id: createUuidV7(),
              venueId: venue.id,
              name: `Court ${courtIndex}`,
            });
          }

          await seedPricingRules(tx, venue.id, categorySlug, venueIndex);
        }
      }
    });

    console.log('CourtHub seed completed. Existing records were reused.');
  } finally {
    await pool.end();
  }
}

void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
