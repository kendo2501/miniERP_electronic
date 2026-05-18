import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

function parseRedisUrl(url: string): { host: string; port: number; password?: string; username?: string } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.username && u.username !== 'default' ? { username: u.username } : {}),
  };
}

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL');
    super(
      redisUrl
        ? { ...parseRedisUrl(redisUrl), retryStrategy: (t) => Math.min(t * 100, 3000), lazyConnect: false }
        : {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            retryStrategy: (t) => Math.min(t * 100, 3000),
            lazyConnect: false,
          },
    );

    this.on('connect', () => this.logger.log('Redis connected'));
    this.on('error', (err) => this.logger.error('Redis error', err.message));
  }

  async onModuleDestroy() {
    await this.quit();
  }

  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.set(key, value, 'EX', ttlSeconds);
  }

  async getAndDel(key: string): Promise<string | null> {
    const value = await this.get(key);
    if (value) await this.del(key);
    return value;
  }
}
