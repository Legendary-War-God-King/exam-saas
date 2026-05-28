/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QuestionService } from './question.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuestionService', () => {
  let service: QuestionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      question: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuestionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<QuestionService>(QuestionService);
  });

  describe('create', () => {
    it('should create a question', async () => {
      prisma.question.create.mockResolvedValue({
        id: 'q1',
        content: 'test',
        type: 'SINGLE_CHOICE',
      });
      const result = await service.create('bank1', {
        type: 'SINGLE_CHOICE',
        content: 'test',
        answer: 'A',
      });
      expect(result.id).toBe('q1');
    });
  });

  describe('bulkImport', () => {
    it('should import valid rows and report errors', async () => {
      prisma.question.createMany.mockResolvedValue({ count: 2 });
      const result = await service.bulkImport('bank1', [
        { type: 'SINGLE_CHOICE', content: 'Q1', answer: 'A', difficulty: 1, tags: [] },
        { type: 'SINGLE_CHOICE', content: 'Q2', answer: 'B', difficulty: 2, tags: ['tag'] },
        { type: 'INVALID', content: 'Q3', answer: 'A', difficulty: 1, tags: [] },
        { type: 'SINGLE_CHOICE', content: '', answer: 'A', difficulty: 1, tags: [] },
      ]);
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors![0].row).toBe(3);
      expect(result.errors![1].row).toBe(4);
    });

    it('should return undefined errors when all valid', async () => {
      prisma.question.createMany.mockResolvedValue({ count: 1 });
      const result = await service.bulkImport('bank1', [
        { type: 'TRUE_FALSE', content: 'Q1', answer: 'T', difficulty: 1, tags: [] },
      ]);
      expect(result.imported).toBe(1);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on question', async () => {
      prisma.question.findFirst.mockResolvedValue({ id: 'q1', deletedAt: null });
      prisma.question.update.mockResolvedValue({ id: 'q1', deletedAt: new Date() });
      await service.softDelete('q1');
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when question not found', async () => {
      prisma.question.findFirst.mockResolvedValue(null);
      await expect(service.softDelete('q1')).rejects.toThrow(NotFoundException);
    });
  });
});
