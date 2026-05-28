/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamService', () => {
  let service: ExamService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exam: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      examQuestion: { create: jest.fn(), delete: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ExamService>(ExamService);
  });

  describe('create', () => {
    it('should create an exam', async () => {
      prisma.exam.create.mockResolvedValue({
        id: 'e1',
        title: 'test',
        _count: { examQuestions: 0 },
      });
      const result = await service.create('t1', 'u1', {
        title: 'test',
        timeLimit: 60,
        passScore: 30,
      });
      expect(result.id).toBe('e1');
    });
  });

  describe('publish', () => {
    it('should generate a 6-digit accessCode and set status PUBLISHED', async () => {
      prisma.exam.findFirst.mockResolvedValue({
        id: 'e1',
        status: 'DRAFT',
        _count: { examQuestions: 1 },
      });
      prisma.exam.update.mockResolvedValue({ id: 'e1', status: 'PUBLISHED', accessCode: '123456' });
      const result = await service.publish('t1', 'e1');
      expect(result.status).toBe('PUBLISHED');
      const callData = prisma.exam.update.mock.calls[0][0].data;
      expect(callData.accessCode).toMatch(/^\d{6}$/);
    });

    it('should reject publish when no questions', async () => {
      prisma.exam.findFirst.mockResolvedValue({
        id: 'e1',
        status: 'DRAFT',
        _count: { examQuestions: 0 },
      });
      await expect(service.publish('t1', 'e1')).rejects.toThrow(BadRequestException);
    });

    it('should reject publish when not DRAFT', async () => {
      prisma.exam.findFirst.mockResolvedValue({
        id: 'e1',
        status: 'PUBLISHED',
        _count: { examQuestions: 1 },
      });
      await expect(service.publish('t1', 'e1')).rejects.toThrow(BadRequestException);
    });
  });
});
