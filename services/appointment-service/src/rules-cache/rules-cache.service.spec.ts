import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { RulesCacheService } from './rules-cache.service';
import { TerminalClientService } from '../terminal-client/terminal-client.service';

describe('RulesCacheService', () => {
  let service: RulesCacheService;
  let terminalClient: { getActiveRules: jest.Mock };

  beforeEach(async () => {
    terminalClient = { getActiveRules: jest.fn() };
    const configService = { get: jest.fn().mockReturnValue(30000) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesCacheService,
        { provide: TerminalClientService, useValue: terminalClient },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<RulesCacheService>(RulesCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fetches and returns a rule value on first access', async () => {
    terminalClient.getActiveRules.mockResolvedValue([
      { ruleKey: 'carrier.daily_quota', value: '10', description: null, active: true },
    ]);

    const value = await service.getRequiredNumber('carrier.daily_quota');
    expect(value).toBe(10);
    expect(terminalClient.getActiveRules).toHaveBeenCalledTimes(1);
  });

  it('does not re-fetch within the TTL window', async () => {
    terminalClient.getActiveRules.mockResolvedValue([
      { ruleKey: 'carrier.daily_quota', value: '10', description: null, active: true },
    ]);

    await service.getRequiredNumber('carrier.daily_quota');
    await service.getRequiredNumber('carrier.daily_quota');

    expect(terminalClient.getActiveRules).toHaveBeenCalledTimes(1);
  });

  it('throws InternalServerErrorException when the requested rule is missing', async () => {
    terminalClient.getActiveRules.mockResolvedValue([]);

    await expect(
      service.getRequiredString('nonexistent-rule'),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('throws ServiceUnavailableException when fetch fails and no cache exists yet', async () => {
    terminalClient.getActiveRules.mockRejectedValue(new Error('network down'));

    await expect(
      service.getRequiredString('carrier.daily_quota'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('parses boolean rule values case-insensitively', async () => {
    terminalClient.getActiveRules.mockResolvedValue([
      { ruleKey: 'train.reservation.required', value: 'true', description: null, active: true },
    ]);

    const value = await service.getRequiredBoolean('train.reservation.required');
    expect(value).toBe(true);
  });
});