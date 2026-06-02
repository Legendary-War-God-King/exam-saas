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
import { QuestionBankService } from './question-bank.service';
import { QuestionService } from './question.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('QuestionBank')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class QuestionBankController {
  constructor(
    private readonly bankService: QuestionBankService,
    private readonly questionService: QuestionService,
  ) {}

  // 题库 CRUD
  @Post('question-banks')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '创建题库' })
  createBank(@Req() req: { user: { tenantId: string } }, @Body() dto: CreateBankDto) {
    return this.bankService.create(req.user.tenantId, dto.name, dto.description);
  }

  @Get('question-banks')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '题库列表' })
  listBanks(@Req() req: { user: { tenantId: string } }, @Query('search') search?: string) {
    return this.bankService.list(req.user.tenantId, search);
  }

  @Get('question-banks/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '题库详情' })
  getBank(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.bankService.findOne(req.user.tenantId, id);
  }

  @Patch('question-banks/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '更新题库' })
  updateBank(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateBankDto,
  ) {
    return this.bankService.update(req.user.tenantId, id, dto);
  }

  @Delete('question-banks/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除题库' })
  deleteBank(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.bankService.softDelete(req.user.tenantId, id);
  }

  // 题目 CRUD
  @Post('question-banks/:bankId/questions')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '创建题目' })
  createQuestion(@Param('bankId') bankId: string, @Body() dto: CreateQuestionDto) {
    return this.questionService.create(bankId, dto);
  }

  @Get('question-banks/:bankId/questions')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '题目列表' })
  listQuestions(
    @Param('bankId') bankId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    return this.questionService.list(bankId, {
      page: parseInt(page ?? '1'),
      limit: parseInt(limit ?? '20'),
      type,
      difficulty,
      search,
    });
  }

  @Post('question-banks/:bankId/questions/import')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '批量导入题目 (JSON)' })
  importQuestions(
    @Param('bankId') bankId: string,
    @Body()
    body: {
      rows: Array<{
        type: string;
        content: string;
        options?: Record<string, string>;
        answer: string;
        difficulty: number;
        tags: string[];
      }>;
    },
  ) {
    return this.questionService.bulkImport(bankId, body.rows);
  }

  @Get('questions/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '题目详情' })
  getQuestion(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.questionService.findOne(id, req.user.tenantId);
  }

  @Patch('questions/:id')
  @Roles('ADMIN', 'TEACHER')
  @ApiOperation({ summary: '更新题目' })
  updateQuestion(
    @Req() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, req.user.tenantId, dto as Record<string, unknown>);
  }

  @Delete('questions/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '删除题目' })
  deleteQuestion(@Req() req: { user: { tenantId: string } }, @Param('id') id: string) {
    return this.questionService.softDelete(id, req.user.tenantId);
  }
}
