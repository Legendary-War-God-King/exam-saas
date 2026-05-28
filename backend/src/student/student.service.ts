import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async auth(tenantId: string, studentNo: string, code: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { tenantId, accessCode: code, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!exam) throw new UnauthorizedException('考试码无效');

    let student = await this.prisma.student.findFirst({
      where: { tenantId, studentNo, deletedAt: null },
    });
    if (!student) {
      student = await this.prisma.student.create({
        data: { tenantId, name: studentNo, studentNo },
      });
    }

    const token = this.jwtService.sign(
      { sub: student.id, studentNo: student.studentNo, tenantId, examId: exam.id, type: 'student' },
      { expiresIn: `${exam.timeLimit + 30}m` },
    );

    return {
      token,
      student: { id: student.id, name: student.name, studentNo: student.studentNo },
      examId: exam.id,
    };
  }

  async getQuestions(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: {
        examQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            score: true,
            sortOrder: true,
            question: {
              select: { id: true, type: true, content: true, options: true, difficulty: true },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('考试不存在');

    // 获取或创建考试记录
    let record = await this.prisma.examRecord.findFirst({
      where: { examId, studentId, status: 'IN_PROGRESS' },
    });
    if (!record) {
      record = await this.prisma.examRecord.create({
        data: { examId, studentId, startTime: new Date(), status: 'IN_PROGRESS' },
      });
    }

    return {
      recordId: record.id,
      timeLimit: exam.timeLimit,
      questions: exam.examQuestions.map((eq) => ({
        id: eq.question.id,
        type: eq.question.type,
        content: eq.question.content,
        options: eq.question.options,
        difficulty: eq.question.difficulty,
        sortOrder: eq.sortOrder,
        score: eq.score,
      })),
    };
  }

  async submitAnswer(
    recordId: string,
    questionId: string,
    selectedAnswer: string,
    timeSpent: number,
  ) {
    const record = await this.prisma.examRecord.findUnique({ where: { id: recordId } });
    if (!record || record.status !== 'IN_PROGRESS') throw new BadRequestException('考试已结束');

    return this.prisma.answer.upsert({
      where: { recordId_questionId: { recordId, questionId } },
      create: { recordId, questionId, selectedAnswer, timeSpent },
      update: { selectedAnswer, timeSpent },
    });
  }

  async submitExam(recordId: string, examId: string) {
    const record = await this.prisma.examRecord.findUnique({ where: { id: recordId } });
    if (!record || record.status !== 'IN_PROGRESS') throw new BadRequestException('考试已结束');

    // 算分
    const examQuestions = await this.prisma.examQuestion.findMany({
      where: { examId },
      select: { questionId: true, score: true, question: { select: { answer: true } } },
    });
    const answers = await this.prisma.answer.findMany({ where: { recordId } });

    let totalScore = 0;
    for (const eq of examQuestions) {
      const ans = answers.find((a) => a.questionId === eq.questionId);
      const correct = ans?.selectedAnswer === eq.question.answer;
      if (correct) totalScore += eq.score;
      if (ans) {
        await this.prisma.answer.update({
          where: { recordId_questionId: { recordId, questionId: eq.questionId } },
          data: { correct },
        });
      }
    }

    return this.prisma.examRecord.update({
      where: { id: recordId },
      data: { status: 'SUBMITTED', endTime: new Date(), score: totalScore },
      select: { id: true, score: true, status: true, endTime: true },
    });
  }

  async getResult(recordId: string) {
    const record = await this.prisma.examRecord.findUnique({
      where: { id: recordId },
      include: {
        exam: { select: { title: true, passScore: true, timeLimit: true } },
        answers: {
          select: { questionId: true, selectedAnswer: true, correct: true, timeSpent: true },
        },
      },
    });
    if (!record) throw new NotFoundException('考试记录不存在');
    return record;
  }
}
