import { IsString, IsOptional, IsInt, IsBoolean, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: '期中考试' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  timeLimit!: number;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(0)
  passScore!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  antiCheat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;
}
