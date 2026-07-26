import databaseConfig from './typeorm.config';

describe('database config', () => {
    it('runs pending migrations automatically on startup', () => {
        const config = databaseConfig() as Record<string, unknown>;

        expect(config.migrations).toBeDefined();
        expect(config.migrationsRun).toBe(true);
    });
});
