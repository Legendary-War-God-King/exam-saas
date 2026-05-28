import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StudentService } from './student.service';

@ApiTags('Student')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post('auth')
  @ApiOperation({ summary: '学生登录 (学号 + 考试码)' })
  auth(@Body() body: { studentNo: string; code: string; tenantId: string }) {
    return this.studentService.auth(body.tenantId, body.studentNo, body.code);
  }

  @Get('exams/:examId/questions')
  @UseGuards(AuthGuard('student-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取考试题目 (不含答案)' })
  getQuestions(@Param('examId') examId: string, @Req() req: { user: { studentId: string } }) {
    return this.studentService.getQuestions(examId, req.user.studentId);
  }

  @Post('exams/:examId/answer')
  @UseGuards(AuthGuard('student-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交单题答案' })
  submitAnswer(
    @Param('examId') examId: string,
    @Body()
    body: { recordId: string; questionId: string; selectedAnswer: string; timeSpent: number },
  ) {
    void examId;
    return this.studentService.submitAnswer(
      body.recordId,
      body.questionId,
      body.selectedAnswer,
      body.timeSpent,
    );
  }

  @Post('exams/:examId/submit')
  @UseGuards(AuthGuard('student-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '交卷' })
  submit(@Param('examId') examId: string, @Body() body: { recordId: string }) {
    return this.studentService.submitExam(body.recordId, examId);
  }

  @Get('exams/:examId/result')
  @UseGuards(AuthGuard('student-jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '查看成绩' })
  getResult(@Param('examId') examId: string, @Body() body: { recordId: string }) {
    void examId;
    return this.studentService.getResult(body.recordId);
  }
}
