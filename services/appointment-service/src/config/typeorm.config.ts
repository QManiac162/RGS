import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Appointment } from '../database/entities/appointment.entity';

export default registerAs(
    'database', 
    (): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.APPOINTMENT_DB,
        entities: [Appointment],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
    }),
);