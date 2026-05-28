import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankDto {
  @ApiProperty({ example: '数据结构题库' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '2026春季学期数据结构课程题库' })
  @IsOptional()
  @IsString()
  description?: string;
}
