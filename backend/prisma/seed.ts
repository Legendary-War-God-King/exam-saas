import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/exam_saas?schema=public',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('SEED_ADMIN_EMAIL 或 SEED_ADMIN_PASSWORD 未配置，跳过 seed');
    return;
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log('ADMIN 已存在，跳过 seed');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: { name: '默认租户' },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: '管理员',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Seed 完成: ${email} (tenant: ${tenant.id})`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
