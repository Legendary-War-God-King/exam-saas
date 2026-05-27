import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    tenant: { create: jest.fn() },
  };

  const mockJwt = { sign: jest.fn(), verify: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
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
        passwordHash: '$2a$12$LJ3m4ys3Lk0TSwHCpNqrEeJBYuHc8MHW8sPJvFd0aYuXNZ7tVnKOy',
        name: '张三',
        role: 'ADMIN',
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
        passwordHash: '$2a$12$differenthashherexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        name: '张三',
        role: 'ADMIN',
      });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'u1',
        tenant_id: 't1',
        role: 'ADMIN',
        type: 'refresh',
      });
      mockJwt.sign.mockReturnValue('new-token');

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
