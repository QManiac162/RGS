import { registerAs } from '@nestjs/config';

export interface TerminalClientConfig {
    baseUrl: string;
    timeoutMs: number;
    rulesCacheTtlMs: number;
}

export default registerAs(
    'terminalClient', 
    (): TerminalClientConfig => ({
        baseUrl: process.env.TERMINAL_CLIENT_BASE_URL || 'http://localhost:3000',
        timeoutMs: process.env.TERMINAL_CLIENT_TIMEOUT_MS ? parseInt(process.env.TERMINAL_CLIENT_TIMEOUT_MS, 10) : 5000,
        rulesCacheTtlMs: process.env.TERMINAL_CLIENT_RULES_CACHE_TTL_MS ? parseInt(process.env.TERMINAL_CLIENT_RULES_CACHE_TTL_MS, 10) : 30000,
    }),
);