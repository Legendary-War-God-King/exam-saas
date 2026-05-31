/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QuestionBankService } from './question-bank.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuestionBankService', () => {
  let service: QuestionBankService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      questionBank: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionBankService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<QuestionBankService>(QuestionBankService);
  });

  describe('create', () => {
    it('should create a question bank', async () => {
      prisma.questionBank.create.mockResolvedValue({
        id: 'b1',
        name: '题库1',
        description: 'desc',
        createdAt: new Date(),
      });
      const result = await service.create('t1', '题库1', 'desc');
      expect(result.name).toBe('题库1');
    });
  });

  describe('list', () => {
    it('should list banks with question count', async () => {
      prisma.questionBank.findMany.mockResolvedValue([
        { id: 'b1', name: '题库1', _count: { questions: 3 } },
      ]);
      const result = await service.list('t1');
      expect(result).toHaveLength(1);
      expect(result[0]._count.questions).toBe(3);
    });

    it('should filter by search', async () => {
      prisma.questionBank.findMany.mockResolvedValue([]);
      await service.list('t1', '搜索词');
      expect(prisma.questionBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: '搜索词' } }),
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt', async () => {
      prisma.questionBank.findFirst.mockResolvedValue({ id: 'b1', deletedAt: null });
      prisma.questionBank.update.mockResolvedValue({});
      await service.softDelete('t1', 'b1');
      expect(prisma.questionBank.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.questionBank.findFirst.mockResolvedValue(null);
      await expect(service.softDelete('t1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
