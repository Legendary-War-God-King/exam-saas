import { Module } from '@nestjs/common';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionService } from './question.service';

@Module({
  controllers: [QuestionBankController],
  providers: [QuestionBankService, QuestionService],
})
export class QuestionBankModule {}
