import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createUser(tenantId: string, adminId: string, name: string, email: string) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email },
    });
    if (existing) {
      throw new ConflictException('该邮箱已被租户内用户使用');
    }

    const tempPassword = this.authService.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        passwordHash,
        role: 'TEACHER',
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    void adminId;
    return { ...user, tempPassword };
  }

  async listUsers(
    tenantId: string,
    params: { page: number; limit: number; search?: string; role?: string },
  ) {
    const skip = (params.page - 1) * params.limit;
    const where: Record<string, unknown> = { tenantId };

    if (params.search) {
      where.OR = [{ name: { contains: params.search } }, { email: { contains: params.search } }];
    }
    if (params.role) {
      where.role = params.role;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          mustChangePassword: true,
          disabledAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit };
  }

  async toggleUser(
    tenantId: string,
    targetId: string,
    adminId: string,
    action: 'enable' | 'disable',
  ) {
    if (targetId === adminId) {
      throw new ForbiddenException('不能禁用自己');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: targetId, tenantId },
    });
    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { disabledAt: action === 'disable' ? new Date() : null },
      select: { id: true, disabledAt: true },
    });
  }
}
