import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { EnvConfig } from '../config/env-config';
import { venues } from './schema';

const API_URL = 'https://www.tinhthanhpho.com/api/v1';
type Province = { code: string; name: string };
type Ward = { code: string; name: string; type: string; province_code: string };
type ApiResponse<T> = { data?: T[]; metadata?: { total?: number } };

const normalize = (value: string) =>
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

const overrideLocations: Record<
  string,
  { address: string; ward: string; wardCode: string; province: string; provinceCode: string }
> = {
  [normalize('214 Nguyễn Tất Thành, Phường Thanh Bình')]: {
    address: '214 Nguyễn Tất Thành',
    ward: 'Phường Hải Châu',
    wardCode: '20242',
    province: 'Đà Nẵng',
    provinceCode: '48',
  },
  [normalize('28 Chi Lăng, Phường Gia Hội')]: {
    address: '28 Chi Lăng',
    ward: 'Phường Phú Xuân',
    wardCode: '19753',
    province: 'Huế',
    provinceCode: '46',
  },
  [normalize('2 Thùy Vân, Phường Thắng Tam')]: {
    address: '2 Thùy Vân',
    ward: 'Phường Tam Thắng',
    wardCode: '26526',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('19 Hoàng Hoa Thám, Phường 2')]: {
    address: '19 Hoàng Hoa Thám',
    ward: 'Phường Vũng Tàu',
    wardCode: '26506',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('63 Lê Hồng Phong, Phường 7')]: {
    address: '63 Lê Hồng Phong',
    ward: 'Phường Vũng Tàu',
    wardCode: '26506',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('38 Yersin, Phú Cường')]: {
    address: '38 Yersin',
    ward: 'Phường Thủ Dầu Một',
    wardCode: '25747',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('121 Đại lộ Bình Dương, Phú Hòa')]: {
    address: '121 Đại lộ Bình Dương',
    ward: 'Phường Thủ Dầu Một',
    wardCode: '25747',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('17 Phú Lợi, Phú Hòa')]: {
    address: '17 Phú Lợi',
    ward: 'Phường Phú Lợi',
    wardCode: '25750',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('52 ĐT747, Uyên Hưng')]: {
    address: '52 ĐT747',
    ward: 'Phường Tân Uyên',
    wardCode: '25888',
    province: 'Hồ Chí Minh',
    provinceCode: '79',
  },
  [normalize('10 Phạm Thái Bường, Phường 4')]: {
    address: '10 Phạm Thái Bường',
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  [normalize('45 Quốc lộ 53, Thị trấn Long Hồ')]: {
    address: '45 Quốc lộ 53',
    ward: 'Xã Long Hồ',
    wardCode: '29602',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  [normalize('22 Tống Phước Hiệp, Phường 1')]: {
    address: '22 Tống Phước Hiệp',
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  [normalize('78 Nguyễn Văn Thiệt, Phường 3')]: {
    address: '78 Nguyễn Văn Thiệt',
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
  [normalize('31 2 Tháng 9, Phường 1')]: {
    address: '31 2 Tháng 9',
    ward: 'Phường Long Châu',
    wardCode: '29551',
    province: 'Vĩnh Long',
    provinceCode: '86',
  },
};

async function fetchAll<T>(path: string, limit: number): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let total = 0;
  do {
    let response = await fetch(`${API_URL}${path}?limit=${limit}&page=${page}`);
    for (let attempt = 0; response.status === 429 && attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      response = await fetch(`${API_URL}${path}?limit=${limit}&page=${page}`);
    }
    if (!response.ok) throw new Error(`Location API failed: ${response.status} ${path}`);
    const payload = (await response.json()) as ApiResponse<T>;
    items.push(...(payload.data ?? []));
    total = payload.metadata?.total ?? items.length;
    page += 1;
  } while (items.length < total);
  return items;
}

const wardLabel = (ward: Ward) => (ward.type ? `${ward.type} ${ward.name}` : ward.name);

async function run() {
  const config = new EnvConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool);

  try {
    const [provinces, rows] = await Promise.all([
      fetchAll<Province>('/new-provinces', 100),
      db
        .select({
          id: venues.id,
          address: venues.address,
          province: venues.province,
          ward: venues.ward,
          wardCode: venues.wardCode,
          provinceCode: venues.provinceCode,
        })
        .from(venues),
    ]);
    const wardsByProvince = new Map<string, Ward[]>();
    const updates: Array<{
      id: string;
      address: string;
      ward: string;
      wardCode: string;
      province: string;
      provinceCode: string;
    }> = [];
    const unresolved: string[] = [];

    for (const row of rows) {
      if (row.ward && row.wardCode && row.provinceCode) continue;

      const override = overrideLocations[normalize(row.address)];
      if (override) {
        updates.push({ id: row.id, ...override });
        continue;
      }
      const provinceKey = provinceAliases[normalize(row.province)] ?? normalize(row.province);
      const province = provinces.find((item) => normalize(item.name).includes(provinceKey));
      if (!province) {
        unresolved.push(`${row.id}: province '${row.province}'`);
        continue;
      }
      let wards = wardsByProvince.get(province.code);
      if (!wards) {
        wards = await fetchAll<Ward>(`/new-provinces/${province.code}/wards`, 500);
        wardsByProvince.set(province.code, wards);
      }
      const parts = row.address.split(',').map((part) => part.trim());
      const index = parts.findIndex((part) =>
        wards.some(
          (item) =>
            normalize(part) === normalize(item.name) ||
            normalize(part) === normalize(wardLabel(item)),
        ),
      );
      const ward =
        index >= 0
          ? wards.find(
              (item) =>
                normalize(parts[index]) === normalize(item.name) ||
                normalize(parts[index]) === normalize(wardLabel(item)),
            )
          : undefined;
      if (!ward) {
        unresolved.push(`${row.id}: ward '${row.address}'`);
        continue;
      }
      updates.push({
        id: row.id,
        address: parts.slice(0, index).join(', '),
        ward: wardLabel(ward),
        wardCode: ward.code,
        province: province.name,
        provinceCode: province.code,
      });
    }

    if (unresolved.length) throw new Error(`Unresolved venues:\n${unresolved.join('\n')}`);
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(venues)
          .set({ ...update, updatedAt: new Date() })
          .where(eq(venues.id, update.id));
      }
    });
    console.log(`Backfilled ${updates.length} venue location records.`);
  } finally {
    await pool.end();
  }
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
