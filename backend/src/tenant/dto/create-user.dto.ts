import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: '李四' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'lisi@example.com' })
  @IsEmail()
  email!: string;
}
