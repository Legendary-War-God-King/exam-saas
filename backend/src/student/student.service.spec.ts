/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn(), create: jest.fn() },
      exam: { findFirst: jest.fn(), findUnique: jest.fn() },
      examQuestion: { findMany: jest.fn() },
      examRecord: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      answer: { findMany: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    redis = { set: jest.fn(), sadd: jest.fn(), expire: jest.fn(), zadd: jest.fn() };
    const mockJwt = { sign: jest.fn().mockReturnValue('token'), verify: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    service = module.get<StudentService>(StudentService);
  });

  describe('submitExam', () => {
    it('should calculate score correctly', async () => {
      // 1st findUnique: 拿 record 校验 status
      prisma.examRecord.findUnique
        .mockResolvedValueOnce({
          id: 'r1',
          status: 'IN_PROGRESS',
          startTime: new Date(Date.now() - 10 * 60000),
          exam: { timeLimit: 30 },
        })
        // 2nd findUnique: 拿最终返回的 record
        .mockResolvedValueOnce({ id: 'r1', score: 5, status: 'SUBMITTED' });
      prisma.examQuestion.findMany.mockResolvedValue([
        { questionId: 'q1', score: 5, question: { answer: 'A' } },
        { questionId: 'q2', score: 3, question: { answer: 'B' } },
      ]);
      prisma.answer.findMany.mockResolvedValue([
        { questionId: 'q1', selectedAnswer: 'A' },
        { questionId: 'q2', selectedAnswer: 'C' },
      ]);
      prisma.answer.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction = jest.fn().mockResolvedValue([]);
      prisma.examRecord.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.submitExam('r1', 'exam1');
      expect(result.score).toBe(5);
      expect(result.status).toBe('SUBMITTED');
    });

    it('should reject if already submitted', async () => {
      prisma.examRecord.findUnique.mockResolvedValue({ id: 'r1', status: 'SUBMITTED' });
      await expect(service.submitExam('r1', 'exam1')).rejects.toThrow(BadRequestException);
    });
  });
});
