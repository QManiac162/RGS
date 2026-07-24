import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from 'ioredis';
import { randomUUID } from "crypto";

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService implements OnModuleDestroy{
    private readonly logger = new Logger(RedisService.name);

    constructor(@Inject(REDIS_CLIENT) private readonly client: Redis){}
    /**
     * Attempts to acquire a short lived token-guarded advisory lock.
     * Retries with a small fized delay if the lock is currently held, since the holder is expected to release within milliseconds.
     */

    async acquireLock(key: string, ttlMs: number, retries: number, retryDelaysMs: number): Promise<string | null>{
        const token = randomUUID();

        for(let attempt = 0; attempt <= retries; attempt++){
            const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
            if(result === 'OK'){
                return token;
            }
            if(attempt < retries){
                await this.delay(retryDelaysMs);
            }
        }

        this.logger.warn(`Failed to acquire lock '${key} after ${retries+1} attempts`);
        return null;
    }

    /**
     * Release this lock only if the caller's token still matches what's stored.
     * This prevents a request from releasing a lock that a different request now owns
     * ex: because the original lock already expired.
     */

    async releaseLock(key: string, token: string): Promise<boolean>{
        const luaScript = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then 
                return redis.call("DEL", KEYS[1])
            else
                return 0
            end
        `;
        const result = (await this.client.eval(luaScript, 1, key, token)) as number;
        return result === 1;
    }

    /**
     * Atomi-cally increments a counter. Sets a TTL only on the 1st increment of a given key, so the number doesn't reset mid-sequence
     * this expires cleany once the day's sequence is no longer needed.
     */

    async incrementSequence(key: string, ttlSeconds: number): Promise<number>{
        const count = await this.client.incr(key);
        if(count === 1){
            await this.client.expire(key, ttlSeconds);
        }
        return count;
    }

    async onModuleDestroy(): Promise<void>{
        await this.client.quit();
    }

    private delay(ms: number): Promise<void>{
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}