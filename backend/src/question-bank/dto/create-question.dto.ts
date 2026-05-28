import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsIn, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'] as const;

export class CreateQuestionDto {
  @ApiProperty({ enum: QUESTION_TYPES })
  @IsString()
  @IsIn(QUESTION_TYPES)
  type!: string;

  @ApiProperty({ example: 'HTTP 协议默认端口是？' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ example: { A: '80', B: '443', C: '8080', D: '3000' } })
  @IsOptional()
  options?: Record<string, string>;

  @ApiProperty({ example: 'A' })
  @IsString()
  answer!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ example: ['网络', 'HTTP'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
