import { Injectable, InternalServerErrorException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminalClientService } from '../terminal-client/terminal-client.service';

@Injectable()
export class RulesCacheService {
  private readonly logger = new Logger(RulesCacheService.name);
  private cache = new Map<string, string>();
  private lastFetchedAt = 0;

  constructor(
    private readonly terminalClient: TerminalClientService,
    private readonly configService: ConfigService,
  ) {}

  async getRequiredString(ruleKey: string): Promise<string> {
    await this.ensureFresh();
    const value = this.cache.get(ruleKey);
    if (value === undefined) {
      throw new InternalServerErrorException(
        `Required rule '${ruleKey}' is missing or inactive in terminal-service`,
      );
    }
    return value;
  }

  async getRequiredNumber(ruleKey: string): Promise<number> {
    const raw = await this.getRequiredString(ruleKey);
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new InternalServerErrorException(
        `Rule "${ruleKey}" has a non-numeric value: "${raw}"`,
      );
    }
    return parsed;
  }

  async getRequiredBoolean(ruleKey: string): Promise<boolean> {
    const raw = await this.getRequiredString(ruleKey);
    return raw.toLowerCase() === 'true';
  }

  private async ensureFresh(): Promise<void> {
    const ttlMs = this.configService.get<number>('terminalClient.rulesCacheTtlMs')!;
    const isStale = Date.now() - this.lastFetchedAt > ttlMs;

    if (!isStale && this.cache.size > 0) {
      return;
    }

    try {
      const rules = await this.terminalClient.getActiveRules();
      const fresh = new Map<string, string>();
      for (const rule of rules) {
        fresh.set(rule.ruleKey, rule.value);
      }
      this.cache = fresh;
      this.lastFetchedAt = Date.now();
    } catch (err) {
      if (this.cache.size > 0) {
        this.logger.warn(
          `Failed to refresh rules cache; continuing with stale values (last refreshed ${new Date(this.lastFetchedAt).toISOString()})`,
        );
        return;
      }
      throw new ServiceUnavailableException(
        'Unable to load business rules from terminal-service and no cached values are available',
      );
    }
  }
}