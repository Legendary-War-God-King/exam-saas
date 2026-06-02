import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let redisStore: Map<string, string>;

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    tenant: { create: jest.fn() },
  };

  const mockJwt = { sign: jest.fn(), verify: jest.fn() };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    redisStore = new Map();
    mockRedis.get.mockImplementation((k: string) => Promise.resolve(redisStore.get(k) ?? null));
    mockRedis.set.mockImplementation((k: string, v: string) => {
      redisStore.set(k, v);
      return Promise.resolve();
    });
    mockRedis.del.mockImplementation((k: string) => {
      redisStore.delete(k);
      return Promise.resolve();
    });
    mockJwt.sign.mockImplementation((payload: { jti?: string }) => {
      if (!payload.jti) return `tok-${Math.random().toString(36).slice(2)}`;
      return `refresh-${payload.jti}`;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto: RegisterDto = {
      tenantName: '测试机构',
      name: '张三',
      email: 'test@example.com',
      password: 'Abc12345',
    };

    it('should register a new tenant and admin user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.tenant.create.mockResolvedValue({ id: 't1', name: '测试机构' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        email: dto.email,
        name: dto.name,
        role: 'ADMIN',
      });
      mockJwt.sign.mockReturnValue('token');

      const result = await service.register(dto);

      expect(result.tenant.id).toBe('t1');
      expect(result.user.role).toBe('ADMIN');
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
    });

    it('should throw ConflictException when email exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const dto: LoginDto = { email: 'test@example.com', password: 'Abc12345' };

    it('should login with valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        email: dto.email,
        passwordHash: bcrypt.hashSync(dto.password, 12),
        name: '张三',
        role: 'ADMIN',
        disabledAt: null,
        mustChangePassword: false,
      });
      mockJwt.sign.mockReturnValue('token');

      const result = await service.login(dto);

      expect(result.accessToken).toBe('token');
      expect(result.tenantId).toBe('t1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password wrong', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        email: dto.email,
        passwordHash: bcrypt.hashSync('WrongPassword99', 12),
        name: '张三',
        role: 'ADMIN',
        disabledAt: null,
        mustChangePassword: false,
      });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is disabled', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        email: dto.email,
        passwordHash: bcrypt.hashSync(dto.password, 12),
        name: '张三',
        role: 'ADMIN',
        disabledAt: new Date(),
        mustChangePassword: false,
      });
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should return setPasswordToken when mustChangePassword is true', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        email: dto.email,
        passwordHash: bcrypt.hashSync(dto.password, 12),
        name: '张三',
        role: 'TEACHER',
        disabledAt: null,
        mustChangePassword: true,
      });
      mockJwt.sign.mockReturnValue('temp-token');

      const result = await service.login(dto);

      expect(result.setPasswordToken).toBe('temp-token');
      expect(result.accessToken).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and write new jti to whitelist', async () => {
      // 预存一个 jti（旧 token 已签发）
      redisStore.set('rt:jti:old-jti-123', 'u1');
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'refresh',
        jti: 'old-jti-123',
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toMatch(/^tok-/);
      expect(result.refreshToken).toMatch(/^refresh-/);
      // 旧 jti 必须被删除
      expect(redisStore.has('rt:jti:old-jti-123')).toBe(false);
      // 新 jti 必须入 whitelist
      const newJti = result.refreshToken.replace('refresh-', '');
      expect(redisStore.get(`rt:jti:${newJti}`)).toBe('u1');
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'access',
        jti: 'j1',
      });
      await expect(service.refresh('access-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.refresh('invalid')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when jti not in whitelist (replay)', async () => {
      // jti 已经被前一次 refresh 删除（重放攻击）
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'refresh',
        jti: 'replayed-jti',
      });
      await expect(service.refresh('replayed-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
