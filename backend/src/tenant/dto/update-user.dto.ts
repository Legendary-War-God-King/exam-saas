import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ enum: ['enable', 'disable'] })
  @IsString()
  @IsIn(['enable', 'disable'])
  action!: 'enable' | 'disable';
}
