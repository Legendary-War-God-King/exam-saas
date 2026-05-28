import { IsString, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ enum: ['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'] })
  @IsOptional()
  @IsString()
  @IsIn(['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  options?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
