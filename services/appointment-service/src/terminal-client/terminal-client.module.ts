import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TerminalClientService } from './terminal-client.service';

@Module({
    imports: [HttpModule.registerAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
            baseURL: configService.get<string>('terminalClient.baseUrl'),
            timeout: configService.get<number>('terminalClient.timeoutMs'),
        }),
    })],
    providers: [TerminalClientService],
    exports: [TerminalClientService]
})
export class TerminalClientModule {}