import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentJwtStrategy } from './strategies/student-jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [StudentController],
  providers: [StudentService, StudentJwtStrategy],
})
export class StudentModule {}
