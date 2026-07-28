import { registerAs } from '@nestjs/config';

export interface TerminalClientConfig {
    baseUrl: string;
    timeoutMs: number;
    rulesCacheTtlMs: number;
}

export default registerAs(
    'terminalClient',
    (): TerminalClientConfig => {
        const baseUrl =
            process.env.TERMINAL_CLIENT_BASE_URL ||
            process.env.TERMINAL_SERVICE_URL ||
            'http://localhost:3000';

        const timeoutMs = process.env.TERMINAL_CLIENT_TIMEOUT_MS
            ? parseInt(process.env.TERMINAL_CLIENT_TIMEOUT_MS, 10)
            : 5000;

        const rulesCacheTtlMs = process.env.TERMINAL_CLIENT_RULES_CACHE_TTL_MS
            ? parseInt(process.env.TERMINAL_CLIENT_RULES_CACHE_TTL_MS, 10)
            : process.env.RULES_CACHE_TTL_MS
            ? parseInt(process.env.RULES_CACHE_TTL_MS, 10)
            : 30000;

        return {
            baseUrl,
            timeoutMs,
            rulesCacheTtlMs,
        };
    },
);