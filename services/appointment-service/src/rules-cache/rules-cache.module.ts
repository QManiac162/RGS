import { Module } from '@nestjs/common';
import { TerminalClientModule } from '../terminal-client/terminal-client.module';
import { RulesCacheService } from './rules-cache.service';

@Module({
  imports: [TerminalClientModule],
  providers: [RulesCacheService],
  exports: [RulesCacheService]
})
export class RulesCacheModule {}