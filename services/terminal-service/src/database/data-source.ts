import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Terminal } from './entities/terminal.entity';
import { CapacityWindow } from './entities/capacity-window.entity';
import { RuleConfig } from './entities/rule-config.entity';

config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [Terminal, CapacityWindow, RuleConfig],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
});