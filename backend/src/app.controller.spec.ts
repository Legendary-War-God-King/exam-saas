import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';

describe('AppController', () => {
  let controller: AppController;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const mockRedis = {
    client: {
      ping: jest.fn().mockResolvedValue('PONG'),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('GET /health (liveness)', () => {
    it('should return status ok', () => {
      const result = controller.liveness();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('should return ok when prisma + redis healthy', async () => {
      const result = await controller.readiness();
      expect(result.status).toBe('ok');
      if ('checks' in result) {
        expect(result.checks.prisma.ok).toBe(true);
        expect(result.checks.redis.ok).toBe(true);
      }
    });

    it('should report degraded when prisma fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
      await expect(controller.readiness()).rejects.toThrow();
    });
  });
});
