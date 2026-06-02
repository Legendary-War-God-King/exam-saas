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

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    tenant: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockJwt = { sign: jest.fn(), verify: jest.fn() };

  const mockRedis = {
    client: {
      exists: jest.fn().mockResolvedValue(0),
      set: jest.fn().mockResolvedValue('OK'),
    },
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
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
      // $transaction 需要返回 user 对象

      mockPrisma.$transaction.mockImplementation((fn: (prisma: unknown) => unknown) => {
        const mockPrismaDelegate = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'u1',
              tenantId: 't1',
              email: dto.email,
              name: dto.name,
              role: 'ADMIN' as const,
            }),
          },
        };
        return fn(mockPrismaDelegate);
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
    it('should refresh tokens with valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'refresh',
        jti: 'jti-123',
      });
      mockJwt.sign.mockReturnValue('new-token');
      mockRedis.client.exists.mockResolvedValue(0);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'access',
      });
      await expect(service.refresh('access-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.refresh('invalid')).rejects.toThrow(UnauthorizedException);
    });
  });
});
