import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/typeorm.config';
import { HealthModule } from './health/health.module';
import { TerminalsModule } from './terminals/terminals.module';
import { RulesModule } from './rules/rules.module';
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                configService.getOrThrow<TypeOrmModuleOptions>('database'),
        }),
        HealthModule,
        TerminalsModule,
        RulesModule,
    ],
})
export class AppModule {}