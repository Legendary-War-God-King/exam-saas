import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ExamAnalysisService } from './exam-analysis.service';

@Module({
  controllers: [ExamController],
  providers: [ExamService, ExamAnalysisService],
})
export class ExamModule {}
