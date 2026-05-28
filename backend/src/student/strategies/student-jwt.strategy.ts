import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class StudentJwtStrategy extends PassportStrategy(Strategy, 'student-jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET 环境变量未配置');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: {
    sub: string;
    studentNo: string;
    tenantId: string;
    examId: string;
    type: string;
  }) {
    if (payload.type !== 'student') return null;
    return {
      studentId: payload.sub,
      studentNo: payload.studentNo,
      tenantId: payload.tenantId,
      examId: payload.examId,
    };
  }
}
