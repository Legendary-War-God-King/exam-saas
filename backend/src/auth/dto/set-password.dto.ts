import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordDto {
  @ApiProperty({ example: 'NewPass123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
