import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  private examSelect = {
    id: true,
    title: true,
    description: true,
    timeLimit: true,
    passScore: true,
    antiCheat: true,
    status: true,
    startTime: true,
    endTime: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { examQuestions: true } },
  };

  async create(
    tenantId: string,
    createdBy: string,
    dto: {
      title: string;
      description?: string;
      timeLimit: number;
      passScore: number;
      antiCheat?: boolean;
      startTime?: string;
      endTime?: string;
    },
  ) {
    return this.prisma.exam.create({
      data: {
        ...dto,
        tenantId,
        createdBy,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
      select: this.examSelect,
    });
  }

  async list(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (status) where.status = status;
    return this.prisma.exam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: this.examSelect,
    });
  }

  async findOne(tenantId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...this.examSelect,
        examQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            score: true,
            sortOrder: true,
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                answer: true,
                difficulty: true,
                tags: true,
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('考试不存在');
    return exam;
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    await this.findOne(tenantId, id);
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime as string) : undefined,
        endTime: data.endTime ? new Date(data.endTime as string) : undefined,
      },
      select: this.examSelect,
    });
  }

  async softDelete(tenantId: string, id: string) {
    const exam = await this.findOne(tenantId, id);
    if (exam.status !== 'DRAFT') throw new BadRequestException('只能删除草稿状态的考试');
    await this.prisma.exam.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async publish(tenantId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { examQuestions: true } } },
    });
    if (!exam) throw new NotFoundException('考试不存在');
    if (exam.status !== 'DRAFT') throw new BadRequestException('只能发布草稿状态的考试');
    if (exam._count.examQuestions === 0) throw new BadRequestException('考试至少需要一道题目');
    const accessCode = String(randomInt(100000, 999999));
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED', accessCode },
      select: { ...this.examSelect, accessCode: true },
    });
  }

  async addQuestion(examId: string, questionId: string, score: number, sortOrder: number) {
    return this.prisma.examQuestion.create({
      data: { examId, questionId, score, sortOrder },
      select: { examId: true, questionId: true, score: true, sortOrder: true },
    });
  }

  async removeQuestion(examId: string, questionId: string) {
    await this.prisma.examQuestion.delete({ where: { examId_questionId: { examId, questionId } } });
  }

  async updateQuestion(
    examId: string,
    questionId: string,
    data: { score?: number; sortOrder?: number },
  ) {
    return this.prisma.examQuestion.update({
      where: { examId_questionId: { examId, questionId } },
      data,
    });
  }

  async generateExam(
    tenantId: string,
    createdBy: string,
    dto: {
      title: string;
      timeLimit: number;
      passScore: number;
      bankId: string;
      questionCount: number;
      difficulty?: number;
    },
  ) {
    // Get questions from bank
    const where: Record<string, unknown> = { bankId: dto.bankId, deletedAt: null };
    if (dto.difficulty) where.difficulty = dto.difficulty;

    const questions = await this.prisma.question.findMany({ where, select: { id: true } });
    if (questions.length < dto.questionCount) {
      throw new BadRequestException(
        `题库仅有 ${questions.length} 道题，无法抽取 ${dto.questionCount} 道`,
      );
    }

    // Random select
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, dto.questionCount);

    // Create exam
    const exam = await this.prisma.exam.create({
      data: {
        tenantId,
        createdBy,
        title: dto.title,
        timeLimit: dto.timeLimit,
        passScore: dto.passScore,
      },
      select: this.examSelect,
    });

    // Add questions
    const examQuestions = selected.map((q, i) => ({
      examId: exam.id,
      questionId: q.id,
      score: 3,
      sortOrder: i + 1,
    }));
    await this.prisma.examQuestion.createMany({ data: examQuestions });

    return { ...exam, questionCount: dto.questionCount };
  }
}
