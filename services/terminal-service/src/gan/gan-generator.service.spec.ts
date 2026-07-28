import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GanGeneratorService } from "./gan-generator.service";
import { RedisService } from "../redis/redis.service";

describe('GanGeneratorService', () => {
    let service: GanGeneratorService;
    let redisService: {
        incrementSequence: jest.Mock
    };

    const formatUtcDate = (date: Date): string => date.toISOString().slice(0, 10);
    const today = new Date();
    const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayDate = formatUtcDate(dayStart);
    const todayCompactDate = todayDate.replace(/-/g, '');
    const tomorrowDate = formatUtcDate(new Date(dayStart.getTime() + 24 * 60 * 60 * 1000));
    const tomorrowCompactDate = tomorrowDate.replace(/-/g, '');

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
        const gan = await service.generateNext('IRN', todayDate);
        expect(gan).toBe(`GAN-IRN-${todayCompactDate}-000001`);
    });

    it('formats a larger sequence number without truncation', async () =>{
        redisService.incrementSequence.mockResolvedValue(482);
        const gan = await service.generateNext('IRN', todayDate);
        expect(gan).toBe(`GAN-IRN-${todayCompactDate}-000482`);
    });

    it('calls incrementSequence with a key scoped to terminal and date', async () =>{
        redisService.incrementSequence.mockResolvedValue(1);
        await service.generateNext('STL', tomorrowDate);
        expect(redisService.incrementSequence).toHaveBeenCalledWith(`gan:seq:STL:${tomorrowCompactDate}`, 172800);
    });
});