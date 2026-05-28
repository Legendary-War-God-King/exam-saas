import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async getResults(tenantId: string, examId: string, page = 1, limit = 20) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } });
    if (!exam) throw new NotFoundException('考试不存在');

    const skip = (page - 1) * limit;
    const where = { examId, status: 'SUBMITTED' as const };

    const [data, total] = await Promise.all([
      this.prisma.examRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { score: 'desc' },
        select: {
          id: true,
          score: true,
          startTime: true,
          endTime: true,
          student: { select: { id: true, name: true, studentNo: true, class: true } },
          _count: { select: { answers: true } },
        },
      }),
      this.prisma.examRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getStatistics(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } });
    if (!exam) throw new NotFoundException('考试不存在');

    const records = await this.prisma.examRecord.findMany({
      where: { examId },
      select: { score: true, status: true },
    });

    const submitted = records.filter((r) => r.status === 'SUBMITTED');
    const scores = submitted.map((r) => r.score ?? 0);

    if (scores.length === 0) {
      return { totalStudents: records.length, submitted: 0, message: '暂无交卷数据' };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const passCount = scores.filter((s) => s >= exam.passScore).length;

    const distribution: Record<string, number> = {
      '0-59': 0,
      '60-69': 0,
      '70-79': 0,
      '80-89': 0,
      '90-100': 0,
    };
    for (const s of scores) {
      if (s < 60) distribution['0-59']++;
      else if (s < 70) distribution['60-69']++;
      else if (s < 80) distribution['70-79']++;
      else if (s < 90) distribution['80-89']++;
      else distribution['90-100']++;
    }

    return {
      totalStudents: records.length,
      submitted: submitted.length,
      max: sorted[sorted.length - 1],
      min: sorted[0],
      avg: Math.round(avg * 100) / 100,
      median,
      passCount,
      passRate: Math.round((passCount / scores.length) * 10000) / 100,
      distribution,
    };
  }

  async getQuestionAnalysis(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId },
      include: {
        examQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            score: true,
            question: {
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                answer: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('考试不存在');

    const records = await this.prisma.examRecord.findMany({
      where: { examId, status: 'SUBMITTED' },
      include: { answers: true },
    });

    return exam.examQuestions.map((eq) => {
      const answerCounts: Record<string, number> = {};
      let correctCount = 0;
      let totalAnswers = 0;

      for (const record of records) {
        const ans = record.answers.find((a) => a.questionId === eq.question.id);
        if (ans) {
          totalAnswers++;
          const key = ans.selectedAnswer ?? '(未作答)';
          answerCounts[key] = (answerCounts[key] ?? 0) + 1;
          if (ans.correct) correctCount++;
        }
      }

      const correctRate =
        totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 10000) / 100 : 0;

      return {
        questionId: eq.question.id,
        content: eq.question.content,
        type: eq.question.type,
        correctAnswer: eq.question.answer,
        correctRate,
        answerDistribution: answerCounts,
        difficulty: eq.question.difficulty,
        actualDifficulty: correctRate > 0 ? Math.round(100 - correctRate) / 100 : null,
      };
    });
  }

  async exportExcel(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, tenantId } });
    if (!exam) throw new NotFoundException('考试不存在');

    const records = await this.prisma.examRecord.findMany({
      where: { examId, status: 'SUBMITTED' },
      orderBy: { score: 'desc' },
      select: {
        score: true,
        startTime: true,
        endTime: true,
        student: { select: { studentNo: true, name: true, class: true } },
      },
    });

    const header = '学号,姓名,班级,分数,用时(分钟),是否及格';
    const rows = records.map((r) => {
      const time =
        r.startTime && r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : '-';
      const pass = (r.score ?? 0) >= exam.passScore ? '是' : '否';
      return [
        r.student.studentNo,
        r.student.name,
        r.student.class ?? '',
        r.score ?? 0,
        time,
        pass,
      ].join(',');
    });

    return Buffer.from([header, ...rows].join('\n'), 'utf-8');
  }
}
