import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      this.logger.warn(`Registration failed: email already exists ${dto.email}`);
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 先创建 tenant 以获取 id
    const tenant = await this.prisma.tenant.create({
      data: { name: dto.tenantName },
    });

    // 使用事务确保原子性
    const user = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'ADMIN',
        },
      });
    });

    const tokens = this.generateTokens(user.id, tenant.id, user.role);
    return {
      tenant: { id: tenant.id, name: tenant.name },
      user: { id: user.id, name: user.name, email: dto.email, role: user.role },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (user.disabledAt !== null) {
      throw new ForbiddenException('账号已被禁用');
    }

    if (user.mustChangePassword) {
      const token = this.jwtService.sign(
        { sub: user.id, type: 'set-password' },
        { expiresIn: '30m' },
      );
      return {
        setPasswordToken: token,
        user: { id: user.id, name: user.name, role: user.role },
      };
    }

    const tokens = this.generateTokens(user.id, user.tenantId, user.role);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: user.tenantId,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { id: true, name: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: user.tenant,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; tenant_id: string; role: string; type: string; jti?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token 类型错误');
    }

    // Refresh Token Rotation: 检查 token 是否在黑名单/已使用
    const tokenKey = `refresh:${payload.sub}:${payload.jti ?? 'legacy'}`;
    const isUsed = await this.redis.client.exists(tokenKey);
    if (isUsed) {
      // Token 被重用，可能存在攻击，清除用户所有 refresh token
      this.logger.warn(`Token reuse detected for user ${payload.sub}, clearing all refresh tokens`);
      void this.clearUserRefreshTokens(payload.sub);
      throw new UnauthorizedException('Refresh Token 已失效，请重新登录');
    }

    // 将旧 token 加入黑名单 (保留 7 天，与 refresh token 有效期一致)
    if (payload.jti) {
      void this.redis.set(tokenKey, '1', 604800);
    }

    return this.generateTokens(payload.sub, payload.tenant_id, payload.role);
  }

  // 清除用户所有 refresh token
  private async clearUserRefreshTokens(userId: string) {
    const pattern = `refresh:${userId}:*`;
    const keys = await this.redis.client.keys(pattern);
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
  }

  generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 8 }, () => chars[randomBytes(1)[0] % chars.length]).join('');
  }

  async setPassword(token: string, password: string) {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }

    if (payload.type !== 'set-password') {
      throw new UnauthorizedException('Token 类型错误');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return this.generateTokens(user.id, user.tenantId, user.role);
  }

  private generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenant_id: tenantId, role };
    const jti = randomBytes(16).toString('hex');

    const accessToken = this.jwtService.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh', jti },
      { secret: process.env.REFRESH_SECRET, expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }
}
