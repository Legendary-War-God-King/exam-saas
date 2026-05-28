import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';

@ApiTags('Exam')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('exams')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '创建考试' })
  create(@Req() req: { user: { tenantId: string; id: string } }, @Body() dto: CreateExamDto) {
    return this.examService.create(req.user.tenantId, req.user.id, dto);
  }

  @Get('exams')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '考试列表' })
  list(@Req() req: { user: { tenantId: string } }, @Query('status') status?: string) {
    return this.examService.list(req.user.tenantId, status);
  }

  @Get('exams/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '考试详情（含题目列表）' })
  get(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.examService.findOne(req.user.tenantId, id);
  }

  @Patch('exams/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '更新考试' })
  update(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.update(req.user.tenantId, id, dto as Record<string, unknown>);
  }

  @Delete('exams/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除考试' })
  delete(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.examService.softDelete(req.user.tenantId, id);
  }

  @Patch('exams/:id/publish')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '发布考试' })
  publish(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.examService.publish(req.user.tenantId, id);
  }

  @Post('exams/:id/questions')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '添加题目到考试' })
  addQuestion(@Param('id') id: string, @Body() dto: AddQuestionDto) {
    return this.examService.addQuestion(id, dto.questionId, dto.score, dto.sortOrder);
  }

  @Delete('exams/:id/questions/:questionId')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '从考试移除题目' })
  removeQuestion(@Param('id') id: string, @Param('questionId') questionId: string) {
    return this.examService.removeQuestion(id, questionId);
  }

  @Patch('exams/:id/questions/:questionId')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '更新题目分值/排序' })
  updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: { score?: number; sortOrder?: number },
  ) {
    return this.examService.updateQuestion(id, questionId, dto);
  }
}
