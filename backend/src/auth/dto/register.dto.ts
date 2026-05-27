import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '阳光培训中心' })
  @IsString()
  @MinLength(2)
  tenantName!: string;

  @ApiProperty({ example: '张三' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'zhangsan@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Abc12345' })
  @IsString()
  @MinLength(8)
  password!: string;
}
