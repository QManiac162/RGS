import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CapacityLockService } from './capacity-lock.service';
import { TerminalsService } from './terminals.service';
import { RedisService } from '../redis/redis.service';
import { TerminalStatus } from '../database/entities/terminal-status.enum';
import { SlotLockBusyException } from './exceptions/slot-lock-busy.exception';
import { CapacityExceededException } from './exceptions/capacity-exceeded.exception';
import { CapacityWindow } from '../database/entities/capacity-window.entity';

describe('CapacityLockService', () => {
  let service: CapacityLockService;
  let dataSource: { createQueryRunner: jest.Mock };
  let terminalsService: { findByCode: jest.Mock };
  let redisService: { acquireLock: jest.Mock; releaseLock: jest.Mock };

  const activeTerminal = {
    code: 'IRN',
    name: 'Irongate',
    lanes: 8,
    status: TerminalStatus.ACTIVE,
    opensAt: null,
  } as const;

  const upcomingTerminal = {
    code: 'FLN',
    name: 'Flintbay',
    lanes: 5,
    status: TerminalStatus.UPCOMING,
    opensAt: new Date(),
  } as const;

  function buildWindow(overrides: Partial<CapacityWindow> = {}): CapacityWindow {
    return {
      id: 'window-uuid-1',
      terminalCode: 'IRN',
      windowStart: new Date('2026-07-20T08:00:00.000Z'),
      windowEnd: new Date('2026-07-20T09:00:00.000Z'),
      maxSlots: 16,
      bookedSlots: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as CapacityWindow;
  }

  function buildQueryRunner(windowRow: CapacityWindow | null) {
    const qb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(windowRow),
    };

    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        save: jest.fn().mockImplementation((_entity: unknown, value: CapacityWindow) => Promise.resolve(value)),
      },
    };
  }

  beforeEach(async () => {
    terminalsService = { findByCode: jest.fn() };
    redisService = { acquireLock: jest.fn().mockResolvedValue('lock-token-abc'), releaseLock: jest.fn().mockResolvedValue(true) };
    dataSource = { createQueryRunner: jest.fn() };

    const configMap: Record<string, number> = {
      'redis.lockTtlMs': 5000,
      'redis.lockRetryCount': 3,
      'redis.lockRetryDelayMs': 50,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacityLockService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: TerminalsService, useValue: terminalsService },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => configMap[key]) } },
      ],
    }).compile();

    service = module.get<CapacityLockService>(CapacityLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveCapacity', () => {
    it('reserves capacity and commits the transaction on the happy path', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      const queryRunner = buildQueryRunner(buildWindow({ bookedSlots: 3 }));
      dataSource.createQueryRunner.mockReturnValue(queryRunner);

    //   // simulate successful lock
      redisService.acquireLock.mockResolvedValue('lock-token-abc');

      const result = await service.reserveCapacity('irn', '2026-07-20T08:00:00.000Z', 2);

      expect(result.bookedSlots).toBe(5);
      expect(result.availableSlots).toBe(11);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalledWith(expect.stringContaining('lock:capacity:IRN:'), 'lock-token-abc');
    });

    it('throws CapacityExceededException and rolls back when units exceed availability', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      const queryRunner = buildQueryRunner(buildWindow({ maxSlots: 16, bookedSlots: 15 }));
      dataSource.createQueryRunner.mockReturnValue(queryRunner);
      redisService.acquireLock.mockResolvedValue('lock-token-abc');

      await expect(
        service.reserveCapacity('IRN', '2026-07-20T08:00:00.000Z', 5),
      ).rejects.toThrow(CapacityExceededException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('throws NotFoundException and rolls back when the capacity window does not exist', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      const queryRunner = buildQueryRunner(null);
      dataSource.createQueryRunner.mockReturnValue(queryRunner);
      redisService.acquireLock.mockResolvedValue('lock-token-abc');

      await expect(
        service.reserveCapacity('IRN', '2026-07-20T23:00:00.000Z', 1),
      ).rejects.toThrow(NotFoundException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('throws SlotLockBusyException without touching the database when the lock cannot be acquired', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      redisService.acquireLock.mockResolvedValue(null);

      await expect(
        service.reserveCapacity('IRN', '2026-07-20T08:00:00.000Z', 1),
      ).rejects.toThrow(SlotLockBusyException);

      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the terminal is not yet operational', async () => {
      terminalsService.findByCode.mockResolvedValue(upcomingTerminal);
      await expect(
        service.reserveCapacity('FLN', '2026-10-05T08:00:00.000Z', 1),
      ).rejects.toThrow(BadRequestException);

      expect(redisService.acquireLock).not.toHaveBeenCalled();
    });
  });

  describe('releaseCapacity', () => {
    it('releases previously booked capacity on the happy path', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      const queryRunner = buildQueryRunner(buildWindow({ bookedSlots: 5 }));
      dataSource.createQueryRunner.mockReturnValue(queryRunner);
      redisService.acquireLock.mockResolvedValue('lock-token-abc');

      const result = await service.releaseCapacity('IRN', '2026-07-20T08:00:00.000Z', 2);

      expect(result.bookedSlots).toBe(3);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('throws BadRequestException when releasing more units than are booked', async () => {
      terminalsService.findByCode.mockResolvedValue(activeTerminal);
      const queryRunner = buildQueryRunner(buildWindow({ bookedSlots: 1 }));
      dataSource.createQueryRunner.mockReturnValue(queryRunner);
      redisService.acquireLock.mockResolvedValue('lock-token-abc');

      await expect(
        service.releaseCapacity('IRN', '2026-07-20T08:00:00.000Z', 3),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
