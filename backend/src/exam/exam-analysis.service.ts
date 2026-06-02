import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
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

    // 用 Map 按 questionId 索引，避免 O(records × questions) 嵌套查找
    const answersByQ = new Map<
      string,
      { total: number; correct: number; dist: Record<string, number> }
    >();
    for (const record of records) {
      for (const ans of record.answers) {
        let agg = answersByQ.get(ans.questionId);
        if (!agg) {
          agg = { total: 0, correct: 0, dist: {} };
          answersByQ.set(ans.questionId, agg);
        }
        agg.total++;
        if (ans.correct) agg.correct++;
        const key = ans.selectedAnswer ?? '(未作答)';
        agg.dist[key] = (agg.dist[key] ?? 0) + 1;
      }
    }

    return exam.examQuestions.map((eq) => {
      const qid = eq.question.id;
      const agg = answersByQ.get(qid);
      const totalAnswers = agg?.total ?? 0;
      const correctCount = agg?.correct ?? 0;
      const correctRate =
        totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 10000) / 100 : 0;

      return {
        questionId: qid,
        content: eq.question.content,
        type: eq.question.type,
        correctAnswer: eq.question.answer,
        correctRate,
        answerDistribution: agg?.dist ?? {},
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

    const wb = new Workbook();
    const ws = wb.addWorksheet('成绩单');
    ws.columns = [
      { header: '学号', key: 'studentNo', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '班级', key: 'class', width: 12 },
      { header: '分数', key: 'score', width: 10 },
      { header: '用时(分钟)', key: 'time', width: 12 },
      { header: '是否及格', key: 'pass', width: 10 },
    ];

    for (const r of records) {
      const time =
        r.startTime && r.endTime
          ? Math.round((r.endTime.getTime() - r.startTime.getTime()) / 60000)
          : '-';
      ws.addRow({
        studentNo: r.student.studentNo,
        name: r.student.name,
        class: r.student.class ?? '',
        score: r.score ?? 0,
        time: String(time),
        pass: (r.score ?? 0) >= exam.passScore ? '是' : '否',
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
