import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, name: string, description?: string) {
    return this.prisma.questionBank.create({
      data: { tenantId, name, description },
      select: { id: true, name: true, description: true, createdAt: true },
    });
  }

  async list(tenantId: string, search?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (search) {
      where.name = { contains: search };
    }
    return this.prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { questions: { where: { deletedAt: null } } } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const bank = await this.prisma.questionBank.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    if (!bank) throw new NotFoundException('题库不存在');
    return bank;
  }

  async update(tenantId: string, id: string, data: { name?: string; description?: string }) {
    await this.findOne(tenantId, id);
    return this.prisma.questionBank.update({
      where: { id },
      data,
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true },
    });
  }

  async softDelete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.questionBank.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
