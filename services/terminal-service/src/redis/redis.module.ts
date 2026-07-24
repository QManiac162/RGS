import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService, REDIS_CLIENT } from './redis.service';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const host = configService.get<string>('redis.host');
                const port = configService.get<number>('redis.port');
                return new Redis({
                    host, 
                    port,
                    maxRetriesPerRequest: 3
                });
            },
        },
        RedisService
    ],
    exports: [RedisService],
})
export class RedisModule {}