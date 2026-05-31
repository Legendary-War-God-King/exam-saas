import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

interface ClientMeta {
  examId: string;
  role: 'student' | 'teacher';
  studentId?: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/proctoring' })
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('Proctoring');
  private clients = new Map<string, ClientMeta>();

  constructor(private readonly redis: RedisService) {}

  handleConnection(client: Socket) {
    const { examId, role, studentId } = client.handshake.query as {
      examId: string;
      role: string;
      studentId?: string;
    };
    if (!examId || !role) {
      client.disconnect();
      return;
    }
    this.clients.set(client.id, { examId, role: role as 'student' | 'teacher', studentId });
    void client.join(`exam:${examId}`);
    this.logger.log(`${role} connected to exam ${examId}`);
  }

  handleDisconnect(client: Socket) {
    const meta = this.clients.get(client.id);
    if (meta) {
      if (meta.studentId) {
        void this.redis.srem(`exam:${meta.examId}:online`, meta.studentId);
        void this.broadcastExamStatus(meta.examId);
      }
      this.clients.delete(client.id);
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket, payload: { recordId: string }) {
    const meta = this.clients.get(client.id);
    if (!meta?.studentId) return;
    const key = `exam:${meta.examId}:heartbeat:${payload.recordId}`;
    await this.redis.set(key, Date.now().toString(), 35);
    await this.redis.sadd(`exam:${meta.examId}:online`, meta.studentId);
    await this.broadcastExamStatus(meta.examId);
  }

  @SubscribeMessage('cheat-event')
  async handleCheatEvent(client: Socket, payload: { eventType: string; duration?: number }) {
    const meta = this.clients.get(client.id);
    if (!meta?.studentId) return;
    const key = `exam:${meta.examId}:cheat:${meta.studentId}`;
    await this.redis.zadd(
      key,
      Date.now(),
      JSON.stringify({
        eventType: payload.eventType,
        duration: payload.duration,
        ts: new Date().toISOString(),
      }),
    );
    this.server.to(`exam:${meta.examId}`).emit('cheat-alert', {
      studentId: meta.studentId,
      eventType: payload.eventType,
      ts: new Date().toISOString(),
    });
  }

  @SubscribeMessage('watch-exam')
  handleWatchExam(client: Socket) {
    const meta = this.clients.get(client.id);
    if (meta) void this.broadcastExamStatus(meta.examId);
  }

  private async broadcastExamStatus(examId: string) {
    const online = await this.redis.smembers(`exam:${examId}:online`);
    this.server.to(`exam:${examId}`).emit('exam-status', { examId, onlineCount: online.length });
  }
}
