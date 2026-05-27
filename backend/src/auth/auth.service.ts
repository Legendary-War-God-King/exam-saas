import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    const tokens = this.generateTokens(user.id, tenant.id, user.role);
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

    const tokens = this.generateTokens(user.id, user.tenantId, user.role);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tenantId: user.tenantId,
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  refresh(refreshToken: string) {
    let payload: { sub: string; tenant_id: string; role: string; type: string };
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

    return this.generateTokens(payload.sub, payload.tenant_id, payload.role);
  }

  private generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenant_id: tenantId, role };

    const accessToken = this.jwtService.sign({ ...payload, type: 'access' }, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { secret: process.env.REFRESH_SECRET, expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }
}
