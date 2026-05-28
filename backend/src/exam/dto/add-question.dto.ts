import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddQuestionDto {
  @ApiProperty()
  @IsString()
  questionId!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  score!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
