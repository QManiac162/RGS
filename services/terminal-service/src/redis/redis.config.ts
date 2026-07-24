import { registerAs } from "@nestjs/config";

export interface RedisConfig{
    host: string;
    port: number;
    lockTtlMs: number;
    lockRetryCount: number;
    lockRetryDelayMs: number;
    ganSequenceTtlSeconds: number;
}

export default registerAs(
    'redis', (): RedisConfig => ({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        lockTtlMs: process.env.LOCK_TTL_MS ? parseInt(process.env.LOCK_TTL_MS, 10) : 5000,
        lockRetryCount: process.env.LOCK_RETRY_COUNT ? parseInt(process.env.LOCK_RETRY_COUNT, 10) : 5,
        lockRetryDelayMs: process.env.LOCK_RETRY_DELAY_MS ? parseInt(process.env.LOCK_RETRY_DELAY_MS, 10) : 100,
        ganSequenceTtlSeconds: process.env.GAN_SEQUENCE_TTL_SECONDS ? parseInt(process.env.GAN_SEQUENCE_TTL_SECONDS, 10) : 172800,
    }),
);