import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Appointment } from './entities/appointment.entity';

config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [Appointment],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
});