import { Injectable, NotFoundException } from '@nestjs/common';
import type { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    bankId: string,
    dto: {
      type: string;
      content: string;
      options?: Record<string, string>;
      answer: string;
      difficulty?: number;
      tags?: string[];
    },
  ) {
    return this.prisma.question.create({
      data: { ...dto, bankId, type: dto.type as QuestionType },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        difficulty: true,
        tags: true,
        createdAt: true,
      },
    });
  }

  async list(
    bankId: string,
    params: { page: number; limit: number; type?: string; difficulty?: string; search?: string },
  ) {
    const skip = (params.page - 1) * params.limit;
    const where: Record<string, unknown> = { bankId, deletedAt: null };
    if (params.type) where.type = params.type;
    if (params.difficulty) where.difficulty = parseInt(params.difficulty);
    if (params.search) where.content = { contains: params.search };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          content: true,
          options: true,
          answer: true,
          difficulty: true,
          tags: true,
          createdAt: true,
        },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { data, total, page: params.page, limit: params.limit };
  }

  async findOne(id: string, tenantId?: string) {
    const where: Record<string, unknown> = { id, deletedAt: null };
    if (tenantId) {
      where.bank = { tenantId, deletedAt: null };
    }
    const q = await this.prisma.question.findFirst({
      where,
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        difficulty: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!q) throw new NotFoundException('题目不存在');
    return q;
  }

  async update(id: string, tenantId: string | undefined, data: Record<string, unknown>) {
    await this.findOne(id, tenantId);
    return this.prisma.question.update({
      where: { id },
      data,
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        difficulty: true,
        tags: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: string, tenantId: string | undefined) {
    await this.findOne(id, tenantId);
    await this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async bulkImport(
    bankId: string,
    rows: Array<{
      type: string;
      content: string;
      options?: Record<string, string>;
      answer: string;
      difficulty: number;
      tags: string[];
    }>,
  ) {
    const errors: Array<{ row: number; reason: string }> = [];
    const valid = rows.filter((r, i) => {
      if (
        !r.type ||
        !['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'].includes(r.type)
      ) {
        errors.push({ row: i + 1, reason: '题型不合法' });
        return false;
      }
      if (!r.content) {
        errors.push({ row: i + 1, reason: '题干不能为空' });
        return false;
      }
      if (!r.answer) {
        errors.push({ row: i + 1, reason: '答案不能为空' });
        return false;
      }
      return true;
    });

    await this.prisma.question.createMany({
      data: valid.map((r) => ({ ...r, bankId, type: r.type as QuestionType })),
    });

    return { imported: valid.length, errors: errors.length > 0 ? errors : undefined };
  }
}
