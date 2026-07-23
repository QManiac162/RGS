import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Terminal } from '../database/entities/terminal.entity';
import { CapacityWindow } from '../database/entities/capacity-window.entity';
import { RuleConfig } from '../database/entities/rule-config.entity';

export default registerAs(
    'database',
    (): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        entities: [Terminal, CapacityWindow, RuleConfig],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
    }),
);