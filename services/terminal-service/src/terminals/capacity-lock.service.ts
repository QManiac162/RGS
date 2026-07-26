import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { RedisService } from "../redis/redis.service";
import { TerminalsService } from "./terminals.service";
import { CapacityWindow } from "../database/entities/capacity-window.entity";
import { TerminalStatus } from "../database/entities/terminal-status.enum";
import { CapacityReservationResponseDto } from "./dto/capacity-reservation-response.dto";
import { SlotLockBusyException } from "./exceptions/slot-lock-busy.exception";
import { CapacityExceededException } from "./exceptions/capacity-exceeded.exception";

@Injectable()
export class CapacityLockService{
    private readonly logger = new Logger(CapacityLockService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly redisService: RedisService,
        private readonly terminalsService: TerminalsService,
        private readonly configService: ConfigService,
    ){}

    async reserveCapacity(codeInput: string, windowStartIso: string, unitsRequested: number): Promise<CapacityReservationResponseDto>{
        const terminal = await this.terminalsService.findByCode(codeInput);
        this.assertOperational(terminal.code, terminal.status);

        const windowStart = this.parseWindowStart(windowStartIso);
        const lockKey = this.buildLockKey(terminal.code, windowStart);
        const lockToken = await this.acquireLockOrThrow(lockKey, terminal.code, windowStart);
        
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try{
            const window = await queryRunner.manager
                .createQueryBuilder(CapacityWindow, 'cw')
                .setLock('pessimistic_write')
                .where('cw.terminal_code = :code AND cw.window_start = :windowStart',{
                    code: terminal.code,
                    windowStart,
            }).getOne();

            if(!window){
                throw new NotFoundException(`No capacity window found for ${terminal.code} at ${windowStart.toISOString()}`);
            }

            const available = window.maxSlots - window.bookedSlots;
            if(unitsRequested > available){
                throw new CapacityExceededException(
                    terminal.code,
                    windowStart.toISOString(),
                    available,
                    unitsRequested,
                );
            }

            window.bookedSlots += unitsRequested;
            await queryRunner.manager.save(CapacityWindow, window);
            await queryRunner.commitTransaction();

            return this.toDto(window);
        } catch(err){
            try{
                await queryRunner.rollbackTransaction();
            } catch (rollbackError) {
                this.logger.warn(`Rollback failed for ${lockKey}: ${rollbackError instanceof Error ? rollbackError.message : rollbackError}`);
            }
            throw err;
        } finally {
            try {
                await queryRunner.release();
            } catch (releaseError) {
                this.logger.warn(`Release failed for ${lockKey}: ${releaseError instanceof Error ? releaseError.message : releaseError}`);
            }
            try {
                await this.redisService.releaseLock(lockKey, lockToken);
            } catch (releaseLockError) {
                this.logger.warn(`Redis lock release failed for ${lockKey}: ${releaseLockError instanceof Error ? releaseLockError.message : releaseLockError}`);
            }
        }
    }

    async releaseCapacity(codeInput: string, windowStartIso: string, unitsToRelease: number): Promise<CapacityReservationResponseDto>{
        const terminal = await this.terminalsService.findByCode(codeInput);
        this.assertOperational(terminal.code, terminal.status);

        const windowStart = this.parseWindowStart(windowStartIso);
        const lockKey = this.buildLockKey(terminal.code, windowStart);
        const lockToken = await this.acquireLockOrThrow(lockKey, terminal.code, windowStart);
        
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try{
            const window = await queryRunner.manager
                .createQueryBuilder(CapacityWindow, 'cw')
                .setLock('pessimistic_write')
                .where('cw.terminal_code = :code AND cw.window_start = :windowStart',{
                    code: terminal.code,
                    windowStart,
            }).getOne();

            if(!window){
                throw new NotFoundException(`No capacity window found for ${terminal.code} at ${windowStart.toISOString()}`);
            }

            if(unitsToRelease > window.bookedSlots){
                throw new BadRequestException(`Cannot release ${unitsToRelease} unit(s); only ${window.bookedSlots} currently booked`,);
            }

            window.bookedSlots -= unitsToRelease;
            await queryRunner.manager.save(CapacityWindow, window);
            await queryRunner.commitTransaction();

            return this.toDto(window);
        } catch(err){
            try{
                await queryRunner.rollbackTransaction();
            } catch (rollbackError) {
                this.logger.warn(`Rollback failed for ${lockKey}: ${rollbackError instanceof Error ? rollbackError.message : rollbackError}`);
            }
            throw err;
        } finally {
            try {
                await queryRunner.release();
            } catch (releaseError) {
                this.logger.warn(`Release failed for ${lockKey}: ${releaseError instanceof Error ? releaseError.message : releaseError}`);
            }
            try {
                await this.redisService.releaseLock(lockKey, lockToken);
            } catch (releaseLockError) {
                this.logger.warn(`Redis lock release failed for ${lockKey}: ${releaseLockError instanceof Error ? releaseLockError.message : releaseLockError}`);
            }
        }
    }

    private assertOperational(code: string, status: TerminalStatus): void{
        if(status === TerminalStatus.UPCOMING){
            throw new BadRequestException(`Terminal '${code}' is not yet operational`);
        }
    }

    private parseWindowStart(windowStartIso: string): Date{
        const parsed = new Date(windowStartIso);
        if(isNaN(parsed.getTime())){
            throw new BadRequestException('Invalid windowStart value');
        }
        return parsed;
    }

    private buildLockKey(terminalCode: string, windowStart: Date): string{
        return `lock:capacity:${terminalCode}:${windowStart.toISOString()}`;
    }

    private async acquireLockOrThrow(lockKey: string, terminalCode: string, windowStart: Date): Promise<string> {
        const ttlMs = this.configService.get<number>('redis.lockTtlMs')!;
        const retries = this.configService.get<number>('redis.lockRetryCount')!;
        const retryDelayMs = this.configService.get<number>('redis.lockRetryDelayMs')!;

        const token = await this.redisService.acquireLock(lockKey, ttlMs, retries, retryDelayMs);
        if(!token){
            throw new SlotLockBusyException(terminalCode, windowStart.toISOString());
        }
        return token;
    }

    private toDto(window: CapacityWindow): CapacityReservationResponseDto{
        return{
            terminalCode: window.terminalCode,
            windowStart: window.windowStart.toISOString(),
            windowEnd: window.windowEnd.toISOString(),
            maxSlots: window.maxSlots,
            bookedSlots: window.bookedSlots,
            availableSlots: window.maxSlots - window.bookedSlots
        };
    }
}