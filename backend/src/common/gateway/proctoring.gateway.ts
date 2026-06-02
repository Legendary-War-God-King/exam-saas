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

const HEARTBEAT_INTERVAL_MS = 1000; // heartbeat 限流：每秒最多一次
const CHEAT_EVENT_LIMIT = 30; // 单连接作弊事件上限

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' },
  namespace: '/proctoring',
})
export class ProctoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('Proctoring');
  private clients = new Map<string, ClientMeta>();
  private lastHeartbeat = new Map<string, number>();
  private cheatCount = new Map<string, number>();

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

    // WebSocket CORS 校验：socket.io 的 cors 选项只对 HTTP 握手生效，
    // WS upgrade 不走 CORS，必须手动检查 Origin 头
    const origin = client.handshake.headers.origin;
    if (origin && origin !== (process.env.FRONTEND_URL ?? 'http://localhost:3000')) {
      this.logger.warn(`Rejected WS from origin: ${origin}`);
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
    this.lastHeartbeat.delete(client.id);
    this.cheatCount.delete(client.id);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket, payload: { recordId: string }) {
    const meta = this.clients.get(client.id);
    if (!meta?.studentId) return;

    // 限流：每秒最多一次
    const now = Date.now();
    const last = this.lastHeartbeat.get(client.id) ?? 0;
    if (now - last < HEARTBEAT_INTERVAL_MS) return;
    this.lastHeartbeat.set(client.id, now);

    const key = `exam:${meta.examId}:heartbeat:${payload.recordId}`;
    await this.redis.set(key, now.toString(), 35);
    await this.redis.sadd(`exam:${meta.examId}:online`, meta.studentId);
    await this.broadcastExamStatus(meta.examId);
  }

  @SubscribeMessage('cheat-event')
  async handleCheatEvent(client: Socket, payload: { eventType: string; duration?: number }) {
    const meta = this.clients.get(client.id);
    if (!meta?.studentId) return;

    // 限流：单连接最多 30 个作弊事件
    const count = (this.cheatCount.get(client.id) ?? 0) + 1;
    if (count > CHEAT_EVENT_LIMIT) {
      client.disconnect();
      return;
    }
    this.cheatCount.set(client.id, count);

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
