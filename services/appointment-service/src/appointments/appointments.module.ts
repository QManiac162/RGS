import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { TerminalClientModule } from '../terminal-client/terminal-client.module';
import { RulesCacheModule } from '../rules-cache/rules-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    TerminalClientModule,
    RulesCacheModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}