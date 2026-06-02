/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-explicit-call, @typescript-eslint/no-unsafe-member-access */
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let store: Map<string, string>;
  let zset: Map<string, Array<{ score: number; member: string }>>;

  beforeEach(() => {
    store = new Map();
    zset = new Map();
    const fakeClient: any = {
      set: jest.fn((k: string, v: string, mode?: string, ttl?: number) => {
        store.set(k, v);
        if (mode === 'EX' && ttl) {
          // ignore TTL in test
        }
        return Promise.resolve('OK');
      }),
      get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      incr: jest.fn((k: string) => {
        const n = (parseInt(store.get(k) ?? '0', 10) || 0) + 1;
        store.set(k, String(n));
        return Promise.resolve(n);
      }),
      expire: jest.fn(() => Promise.resolve(1)),
      del: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve(1);
      }),
      sadd: jest.fn((k: string, m: string) => {
        const set = new Set(store.get(k)?.split(',') ?? []);
        set.add(m);
        store.set(k, [...set].join(','));
        return Promise.resolve(set.size);
      }),
      smembers: jest.fn((k: string) =>
        Promise.resolve((store.get(k) ?? '').split(',').filter(Boolean)),
      ),
      srem: jest.fn((k: string, m: string) => {
        const set = new Set((store.get(k) ?? '').split(',').filter(Boolean));
        set.delete(m);
        store.set(k, [...set].join(','));
        return Promise.resolve(1);
      }),
      zadd: jest.fn((k: string, score: number, member: string) => {
        const list = zset.get(k) ?? [];
        list.push({ score, member });
        zset.set(k, list);
        return Promise.resolve(1);
      }),
      zrange: jest.fn((k: string) => {
        const list = zset.get(k) ?? [];
        return Promise.resolve(list.sort((a, b) => a.score - b.score).map((e) => e.member));
      }),
      disconnect: jest.fn(),
    };
    service = new RedisService(fakeClient);
  });

  describe('set/get', () => {
    it('should store and retrieve values', async () => {
      await service.set('key1', 'val1');
      expect(await service.get('key1')).toBe('val1');
    });

    it('should return null for missing key', async () => {
      expect(await service.get('missing')).toBeNull();
    });
  });

  describe('incr', () => {
    it('should increment counter from 0', async () => {
      const v = await service.incr('counter');
      expect(v).toBe(1);
    });

    it('should increment existing counter', async () => {
      store.set('counter', '5');
      const v = await service.incr('counter');
      expect(v).toBe(6);
    });
  });

  describe('expire + del', () => {
    it('should expire key', async () => {
      await service.expire('any', 60);
      expect((service.client as any).expire).toHaveBeenCalledWith('any', 60);
    });

    it('should delete key', async () => {
      store.set('k', 'v');
      await service.del('k');
      expect(store.has('k')).toBe(false);
    });
  });

  describe('set operations', () => {
    it('sadd adds members', async () => {
      await service.sadd('myset', 'a');
      await service.sadd('myset', 'b');
      const members = await service.smembers('myset');
      expect(members).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('srem removes members', async () => {
      await service.sadd('myset', 'a');
      await service.sadd('myset', 'b');
      await service.srem('myset', 'a');
      const members = await service.smembers('myset');
      expect(members).toEqual(['b']);
    });
  });

  describe('sorted set operations', () => {
    it('zadd + zrange should return members in score order', async () => {
      await service.zadd('log', 100, 'first');
      await service.zadd('log', 200, 'second');
      const result = await service.zrange('log', 0, -1);
      expect(result).toEqual(['first', 'second']);
    });
  });
});
