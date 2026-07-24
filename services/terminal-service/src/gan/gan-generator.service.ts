import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class GanGeneratorService{
    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ){}
    /**
     * Produces a Fate Appointment Number (GAN) of the format: GAN-<TERMINAL>-<YYYYMMDD>-<6 digit seq>
     * The sequence resets naturally each day because teh Redis key is scoped by date and carries its own TTL (set on 1st use)
     */

    async generateNext(terminalCode: string, dateStr: string): Promise<string> {
        const compactDate = dateStr.replace(/-/g, '');
        const sequenceKey = `gan:seq${terminalCode}:${compactDate}`;
        const ttlSeconds = this.configService.get<number>('redis.ganSequenceTtlSeconds',)!;
        const sequence = await this.redisService.incrementSequence(sequenceKey, ttlSeconds);
        const paddedSequence = sequence.toString().padStart(6, '0');

        return `GAN-${terminalCode}-${compactDate}-${paddedSequence}`;
    }
}