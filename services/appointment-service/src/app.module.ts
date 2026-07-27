import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/typeorm.config';
import terminalClientConfig from './config/terminal-client.config';
import { HealthModule } from './health/health.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, terminalClientConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow<TypeOrmModuleOptions>('database'),
    }),
    HealthModule,
    AppointmentsModule,
  ],
})
export class AppModule {}