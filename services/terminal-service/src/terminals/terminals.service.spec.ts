import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { TerminalsService } from './terminals.service';
import { Terminal } from '../database/entities/terminal.entity';
import { CapacityWindow } from '../database/entities/capacity-window.entity';
import { TerminalStatus } from '../database/entities/terminal-status.enum';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = <T extends ObjectLiteral>(): MockRepo<T> => ({
    find: jest.fn(),
    findOne: jest.fn(),
});

describe('TerminalsService', () => {
    let service: TerminalsService;
    let terminalRepo: MockRepo<Terminal>;
    let capacityRepo: MockRepo<CapacityWindow>;

    const formatUtcDate = (date: Date): string => date.toISOString().slice(0, 10);
    const today = new Date();
    const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayDate = formatUtcDate(dayStart);
    const todayWindowStartIso = `${todayDate}T08:00:00Z`;
    const futureOpenDate = new Date(dayStart.getTime() + 60 * 24 * 60 * 60 * 1000);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TerminalsService,
                {
                    provide: getRepositoryToken(Terminal),
                    useValue: createMockRepo<Terminal>()
                },
                {
                    provide: getRepositoryToken(CapacityWindow),
                    useValue: createMockRepo<CapacityWindow>()
                },
            ],
        }).compile();

        service = module.get<TerminalsService>(TerminalsService);
        terminalRepo = module.get(getRepositoryToken(Terminal));
        capacityRepo = module.get(getRepositoryToken(CapacityWindow));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });


    describe('findAll', () => {
        it('returns all terminals mapped to DTOs', async () => {
            terminalRepo.find!.mockResolvedValue([
                {
                    code: 'IRN', 
                    name: 'Irongate', 
                    lanes: 8, 
                    status: TerminalStatus.ACTIVE, 
                    opensAt: null
                },
            ]);

            const result = await service.findAll();
            expect(result).toEqual([
                {
                    code: 'IRN', 
                    name: 'Irongate', 
                    lanes: 8, 
                    status: TerminalStatus.ACTIVE, 
                    opensAt: null
                },
            ]);
        });
    });


    describe('findByCode', () => {
        it('returns the terminal when found', async () => {
            terminalRepo.findOne!.mockResolvedValue(
                {
                    code: 'STL',
                    name: 'Steelyard',
                    lanes: 6,
                    status: TerminalStatus.ACTIVE,
                    opensAt: null
                }
            );

            const result = await service.findByCode('stl');
            expect(result.code).toBe('STL');
            expect(terminalRepo.findOne).toHaveBeenCalledWith({
                where: {
                    code: 'STL'
                }
            });
        });

        it('throws NotFoundException when terminal does not exist', async () => {
            terminalRepo.findOne!.mockResolvedValue(null);
            await expect(service.findByCode('ZZZ')).rejects.toThrow(NotFoundException);
        });
    });


    describe('getCapacityForDate', () => {
        it('throws notFoundException when terminal does not exist', async () =>{
            terminalRepo.findOne!.mockResolvedValue(null);
            await expect(service.getCapacityForDate('ZZZ', todayDate)).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when terminal is UPCOMING', async () =>{
            terminalRepo.findOne!.mockResolvedValue({
                code: 'FLN',
                name: 'Flintbay',
                lanes: 5,
                status: TerminalStatus.UPCOMING,
                opensAt: futureOpenDate,
            });
            await expect(service.getCapacityForDate('FLN', todayDate)).rejects.toThrow(BadRequestException);
        });

        it('throws BadRequestException for an invalid date value', async () => {
            terminalRepo.findOne!.mockResolvedValue({
                code: 'IRN',
                name: 'Irongate',
                lanes: 8,
                status: TerminalStatus.ACTIVE,
                opensAt: null,
            });
            await expect(service.getCapacityForDate('IRN', 'not-a-date')).rejects.toThrow(BadRequestException);
        });

        it('returns mapped capacity windows for a valid active terminal', async () => {
            terminalRepo.findOne!.mockResolvedValue({
                code: 'IRN',
                name: 'Irongate',
                lanes: 8,
                status: TerminalStatus.ACTIVE,
                opensAt: null,
            });
            capacityRepo.find!.mockResolvedValue([
                {
                    id: 'uuid-1',
                    terminalCode: 'IRN',
                    windowStart: new Date(todayWindowStartIso),
                    windowEnd: new Date(todayWindowStartIso.replace('08:00:00Z', '09:00:00Z')),
                    maxSlots: 16,
                    bookedSlots: 3,
                },
            ]);

            const result = await service.getCapacityForDate('IRN', todayDate);
            expect(result).toHaveLength(1);
            expect(result[0].availableSlots).toBe(13);
        });
    });
});