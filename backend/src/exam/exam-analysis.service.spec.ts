/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ExamAnalysisService } from './exam-analysis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamAnalysisService', () => {
  let service: ExamAnalysisService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exam: { findFirst: jest.fn() },
      examRecord: { findMany: jest.fn(), count: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamAnalysisService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ExamAnalysisService>(ExamAnalysisService);
  });

  describe('getStatistics', () => {
    it('should calculate avg/max/min/passRate correctly', async () => {
      prisma.exam.findFirst.mockResolvedValue({ passScore: 60 });
      prisma.examRecord.findMany.mockResolvedValue([
        { score: 80, status: 'SUBMITTED' },
        { score: 40, status: 'SUBMITTED' },
        { score: 90, status: 'SUBMITTED' },
      ]);

      const result = await service.getStatistics('t1', 'e1');
      expect(result.submitted).toBe(3);
      expect(result.max).toBe(90);
      expect(result.min).toBe(40);
      expect(result.avg).toBe(70);
      expect(result.passCount).toBe(2);
      expect(result.passRate).toBe(66.67);
      expect(result.distribution!['0-59']).toBe(1);
      expect(result.distribution!['90-100']).toBe(1);
    });
  });

  describe('getQuestionAnalysis', () => {
    it('should calculate correctRate per question', async () => {
      prisma.exam.findFirst.mockResolvedValue({
        examQuestions: [
          {
            score: 5,
            question: {
              id: 'q1',
              type: 'SINGLE_CHOICE',
              content: 'Q1',
              options: null,
              answer: 'A',
              difficulty: 1,
            },
          },
        ],
      });
      prisma.examRecord.findMany.mockResolvedValue([
        { answers: [{ questionId: 'q1', selectedAnswer: 'A', correct: true }] },
        { answers: [{ questionId: 'q1', selectedAnswer: 'B', correct: false }] },
      ]);

      const result = await service.getQuestionAnalysis('t1', 'e1');
      expect(result[0].correctRate).toBe(50);
      expect(result[0].answerDistribution.A).toBe(1);
      expect(result[0].answerDistribution.B).toBe(1);
    });
  });

  describe('exportExcel', () => {
    it('should generate xlsx buffer', async () => {
      prisma.exam.findFirst.mockResolvedValue({ passScore: 60 });
      prisma.examRecord.findMany.mockResolvedValue([
        {
          score: 80,
          startTime: new Date('2026-01-01T10:00:00Z'),
          endTime: new Date('2026-01-01T10:30:00Z'),
          student: { studentNo: '001', name: 'Tom', class: 'A班' },
        },
      ]);

      const buffer = await service.exportExcel('t1', 'e1');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });
});
