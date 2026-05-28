import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) await this.client.set(key, value, 'EX', ttl);
    else await this.client.set(key, value);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async expire(key: string, ttl: number) {
    await this.client.expire(key, ttl);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async sadd(key: string, member: string) {
    await this.client.sadd(key, member);
  }

  async smembers(key: string) {
    return this.client.smembers(key);
  }

  async srem(key: string, member: string) {
    await this.client.srem(key, member);
  }

  async zadd(key: string, score: number, member: string) {
    await this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number) {
    return this.client.zrange(key, start, stop);
  }
}
