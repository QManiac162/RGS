import { Test, TestingModule } from '@nestjs/testing';
import { RedisService, REDIS_CLIENT } from "./redis.service";
import { strict } from 'assert';

describe('RedisService', ()=>{
    let service: RedisService;
    let mockClient: {
        set: jest.Mock;
        eval: jest.Mock;
        incr: jest.Mock;
        expire: jest.Mock;
        quit: jest.Mock;
    };

    beforeEach(async () => {
        mockClient = {
            set: jest.fn(),
            eval: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            quit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisService, {
                    provide: REDIS_CLIENT,
                    useValue: mockClient
                },
            ],
        }).compile();

        service = module.get<RedisService>(RedisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('acquireLock', () =>{
        it('returns a token immediately when the lock is free', async () =>{
            mockClient.set.mockResolvedValue('OK');
            const token = await service.acquireLock('lock:test', 5000, 3, 10);
            expect(token).not.toBeNull();
            expect(mockClient.set).toHaveBeenCalledTimes(1);
            expect(mockClient.set).toHaveBeenCalledWith('lock:test', expect.any(String), 'PX', 5000, 'NX');
        });

        it('retries the configured number of times then returns null if the lock never frees', async () => {
            mockClient.set.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce('OK');
            const token = await service.acquireLock('lock:test', 5000, 3, 5);
            expect(token).not.toBeNull();
            expect(mockClient.set).toHaveBeenCalledTimes(3);
        });

        it('succeeds on a later retry if the lock frees up', async () => {
            mockClient.set.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce('OK');
            const token = await service.acquireLock('lock:test', 5000, 3, 5);
            expect(token).not.toBeNull();
            expect(mockClient.set).toHaveBeenCalledTimes(3);
        });
    });

    describe('releaseLock', () => {
        it('returns true when the tokens matches and the key os deleted', async () =>{
            mockClient.eval.mockResolvedValue(1);
            const result = await service.releaseLock('lock:test', 'token-123');
            expect(result).toBe(true);
        });

        it('returns false when the token does not match', async () =>{
            mockClient.eval.mockResolvedValue(0);
            const result = await service.releaseLock('lock:test', 'wrong-token');
            expect(result).toBe(false);
        });
    });
    
    describe('incrementSequence', () => {
        it('sets an expiry only on the first increment', async () =>{
            mockClient.incr.mockResolvedValue(1);
            const count = await service.incrementSequence('seq:test', 172800);
            expect(count).toBe(1);
            expect(mockClient.expire).toHaveBeenCalledWith('seq:test', 172800);
        });

        it('does not reset the expiry on subsequent increments', async () =>{
            mockClient.incr.mockResolvedValue(2);
            const count = await service.incrementSequence('seq:test', 172800);
            expect(count).toBe(2);
            expect(mockClient.expire).not.toHaveBeenCalled();
        });
    });
});