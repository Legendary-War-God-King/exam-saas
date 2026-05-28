/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GET /auth/me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `test-me-${Date.now()}@example.com`;
  const password = 'Abc12345';
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    // 注册用户
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        tenantName: 'MeTest',
        name: 'Tester',
        email,
        password,
      })
      .expect(201);

    accessToken = registerRes.body.accessToken as string;
  });

  afterAll(async () => {
    // 清理测试用户
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE email = '${email}'`);
    await prisma.$executeRawUnsafe(
      `DELETE FROM tenants WHERE id NOT IN (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1)`,
    );
    await app.close();
  });

  it('should return current user info', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe(email);
    expect(res.body.name).toBe('Tester');
    expect(res.body.role).toBe('ADMIN');
    expect(res.body.tenant).toBeDefined();
    expect(res.body.tenant.name).toBe('MeTest');
  });

  it('should return 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('should return 401 with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
