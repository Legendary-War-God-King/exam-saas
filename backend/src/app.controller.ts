import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '基础健康检查 (Liveness)' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  @Get('health/ready')
  @ApiOperation({ summary: '深度健康检查 (Readiness) — 检测 Prisma + Redis' })
  async readiness() {
    const checks = await Promise.allSettled([this.checkPrisma(), this.checkRedis()]);
    const [prismaResult, redisResult] = checks;

    const prismaOk = prismaResult.status === 'fulfilled' && prismaResult.value.ok;
    const redisOk = redisResult.status === 'fulfilled' && redisResult.value.ok;
    const allOk = prismaOk && redisOk;

    const body = {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      checks: {
        prisma:
          prismaResult.status === 'fulfilled'
            ? prismaResult.value
            : { ok: false, error: String(prismaResult.reason) },
        redis:
          redisResult.status === 'fulfilled'
            ? redisResult.value
            : { ok: false, error: String(redisResult.reason) },
      },
    };

    if (!allOk) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }

  private async checkPrisma(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - start };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown' };
    }
  }

  private async checkRedis(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const pong: string = await this.redis.client.ping();
      return { ok: pong === 'PONG', latencyMs: Date.now() - start };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown' };
    }
  }
}
