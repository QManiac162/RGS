import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GanGeneratorService } from "./gan-generator.service";
import { RedisService } from "../redis/redis.service";

describe('GanGeneratorService', () => {
    let service: GanGeneratorService;
    let redisService: {
        incrementSequence: jest.Mock
    };

    beforeEach(async () => {
        redisService = {
            incrementSequence: jest.fn()
        };
        const configService = {
            get: jest.fn().mockReturnValue(172800)
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GanGeneratorService,
                {
                    provide: RedisService,
                    useValue: redisService
                },
                {
                    provide: ConfigService,
                    useValue: configService
                },
            ],
        }).compile();

        service = module.get<GanGeneratorService>(GanGeneratorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('formats a small sequence number with zero-padding', async () =>{
        redisService.incrementSequence.mockResolvedValue(1);
        const gan = await service.generateNext('IRN', '2026-07-20');
        expect(gan).toBe('GAN-IRN-20260720-000482');
    });

    it('formats a larger sequence number without truncation', async () =>{
        redisService.incrementSequence.mockResolvedValue(482);
        const gan = await service.generateNext('IRN', '2026-07-20');
        expect(gan).toBe('GAN-IRN-20260720-000482');
    });

    it('calls incrementSequence with a key scoped to terminal and date', async () =>{
        redisService.incrementSequence.mockResolvedValue(1);
        await service.generateNext('STL', '2026-07-21');
        expect(redisService.incrementSequence).toHaveBeenCalledWith('gan:seq:STL:20260721', 172800);
    });
});