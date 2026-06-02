import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
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
    const record = await this.prisma.examRecord.findUnique({
      where: { id: recordId },
      include: { exam: { select: { timeLimit: true, startTime: true } } },
    });
    if (!record || record.status !== 'IN_PROGRESS') throw new BadRequestException('考试已结束');

    // 超时检查: 开始时间 + 时间限制 + 5分钟缓冲
    if (record.startTime) {
      const deadline = new Date(record.startTime.getTime() + (record.exam.timeLimit + 5) * 60000);
      if (new Date() > deadline) throw new BadRequestException('考试已超时，无法交卷');
    }

    // 算分 — 内存算完后按正确/错误分两组各 updateMany 一次
    const examQuestions = await this.prisma.examQuestion.findMany({
      where: { examId },
      select: { questionId: true, score: true, question: { select: { answer: true } } },
    });
    const answers = await this.prisma.answer.findMany({ where: { recordId } });

    const answerByQ = new Map(answers.map((a) => [a.questionId, a]));
    const correctIds: string[] = [];
    const wrongIds: string[] = [];
    let totalScore = 0;

    for (const eq of examQuestions) {
      const ans = answerByQ.get(eq.questionId);
      if (!ans) continue;
      if (ans.selectedAnswer === eq.question.answer) {
        totalScore += eq.score;
        correctIds.push(eq.questionId);
      } else {
        wrongIds.push(eq.questionId);
      }
    }

    // 原子翻转 status：updateMany 带 where.status='IN_PROGRESS'，count=0 说明已被其他请求抢先
    const { count } = await this.prisma.examRecord.updateMany({
      where: { id: recordId, status: 'IN_PROGRESS' },
      data: { status: 'SUBMITTED', endTime: new Date(), score: totalScore },
    });
    if (count === 0) throw new BadRequestException('考试已结束');

    // 答案 correct 标记幂等（已被提交的 record 重做不影响最终分数）
    await this.prisma.$transaction([
      ...(correctIds.length
        ? [
            this.prisma.answer.updateMany({
              where: { recordId, questionId: { in: correctIds } },
              data: { correct: true },
            }),
          ]
        : []),
      ...(wrongIds.length
        ? [
            this.prisma.answer.updateMany({
              where: { recordId, questionId: { in: wrongIds } },
              data: { correct: false },
            }),
          ]
        : []),
    ]);

    return this.prisma.examRecord.findUnique({
      where: { id: recordId },
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

  async getWrongQuestions(studentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const answers = await this.prisma.answer.findMany({
      where: { correct: false, record: { studentId, status: 'SUBMITTED' } },
      orderBy: { record: { createdAt: 'desc' } },
      include: {
        record: { select: { exam: { select: { title: true } } } },
      },
    });

    const questionIds = [...new Set(answers.map((a) => a.questionId))].slice(skip, skip + limit);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, deletedAt: null },
      select: {
        id: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        difficulty: true,
        tags: true,
      },
    });

    return {
      data: questions.map((q) => ({
        ...q,
        wrongCount: answers.filter((a) => a.questionId === q.id).length,
        lastExam: answers.find((a) => a.questionId === q.id)?.record.exam.title,
      })),
      total: questionIds.length,
      page,
      limit,
    };
  }

  async heartbeat(recordId: string, examId: string) {
    const record = await this.prisma.examRecord.findUnique({ where: { id: recordId } });
    if (!record || record.status !== 'IN_PROGRESS') throw new BadRequestException('考试已结束');

    const key = `exam:${examId}:heartbeat:${recordId}`;
    await this.redis.set(key, Date.now().toString(), 35);

    // 在线考生集合 (教师监考用)
    await this.redis.sadd(`exam:${examId}:online`, recordId);
    await this.redis.expire(`exam:${examId}:online`, 60);

    return { ts: Date.now() };
  }

  async cheatEvent(recordId: string, examId: string, eventType: string, duration?: number) {
    const record = await this.prisma.examRecord.findUnique({ where: { id: recordId } });
    if (!record || record.status !== 'IN_PROGRESS') throw new BadRequestException('考试已结束');

    const key = `exam:${examId}:cheat:${recordId}`;
    await this.redis.zadd(
      key,
      Date.now(),
      JSON.stringify({ eventType, duration, ts: new Date().toISOString() }),
    );
    await this.redis.expire(key, 86400);
  }
}
