/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('TenantService', () => {
  let service: TenantService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    const mockAuth = { generateTempPassword: jest.fn().mockReturnValue('aB3xK9mQ') };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();
    service = module.get<TenantService>(TenantService);
  });

  describe('createUser', () => {
    it('should create a teacher with temp password', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        name: '李四',
        email: 'lisi@test.com',
        role: 'TEACHER',
      });

      const result = await service.createUser('t1', 'admin1', '李四', 'lisi@test.com');

      expect(result.tempPassword).toBe('aB3xK9mQ');
      expect(result.name).toBe('李四');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mustChangePassword: true }) }),
      );
    });

    it('should throw ConflictException when email exists in tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.createUser('t1', 'admin1', '李四', 'dup@test.com')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('toggleUser', () => {
    it('should disable a user', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', tenantId: 't1' });
      prisma.user.update.mockResolvedValue({ id: 'u2', disabledAt: new Date() });

      const result = await service.toggleUser('t1', 'u2', 'admin1', 'disable');
      expect(result.disabledAt).toBeDefined();
    });

    it('should enable a user', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', tenantId: 't1' });
      prisma.user.update.mockResolvedValue({ id: 'u2', disabledAt: null });

      const result = await service.toggleUser('t1', 'u2', 'admin1', 'enable');
      expect(result.disabledAt).toBeNull();
    });

    it('should reject disabling self', async () => {
      await expect(service.toggleUser('t1', 'admin1', 'admin1', 'disable')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
