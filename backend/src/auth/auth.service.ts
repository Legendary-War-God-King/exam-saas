import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 天
const WHITELIST_PREFIX = 'rt:jti:';

@Injectable()
export class AuthService {
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
      throw new ConflictException('该邮箱已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: { name: dto.tenantName },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: 'ADMIN',
      },
    });

    const tokens = await this.generateTokens(user.id, tenant.id, user.role);
    return {
      tenant: { id: tenant.id, name: tenant.name },
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
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

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
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
    let payload: { sub: string; tenant_id: string; role: string; type: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Token 类型错误');
    }

    // Rotation: 检查 jti 是否在 whitelist（重放即失效）
    const key = WHITELIST_PREFIX + payload.jti;
    const owner = await this.redis.get(key);
    if (owner !== payload.sub) {
      throw new UnauthorizedException('Refresh Token 已失效');
    }

    // 立刻删除旧 jti（防重放窗口期）
    await this.redis.del(key);

    return await this.generateTokens(payload.sub, payload.tenant_id, payload.role);
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

    return await this.generateTokens(user.id, user.tenantId, user.role);
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenant_id: tenantId, role };

    const accessToken = this.jwtService.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });

    const jti = randomBytes(16).toString('hex');
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh', jti },
      { secret: process.env.REFRESH_SECRET, expiresIn: '7d' },
    );

    // whitelist 新 jti（rotation 用）
    await this.redis.set(WHITELIST_PREFIX + jti, userId, REFRESH_TTL_SEC);

    return { accessToken, refreshToken };
  }
}
