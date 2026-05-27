import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'zhangsan@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Abc12345' })
  @IsString()
  password!: string;
}
