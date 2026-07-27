import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentStatus } from '../database/entities/appointment-status.enum';
import { ServiceType } from '../database/entities/service-type.enum';
import { TerminalClientService } from '../terminal-client/terminal-client.service';
import { RulesCacheService } from '../rules-cache/rules-cache.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { BookingWindowViolationException } from './exceptions/booking-window-violation.exception';
import { DailyQuotaExceededException } from './exceptions/daily-quota-exceeded.exception';
import { TrainReservationRequiredException } from './exceptions/train-reservation-required.exception';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly terminalClient: TerminalClientService,
    private readonly rulesCache: RulesCacheService,
  ) {}

  async createAppointment(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const terminalCode = dto.terminalCode.toUpperCase();
    const scheduledStart = new Date(dto.scheduledStart);

    this.assertHourAligned(scheduledStart);
    await this.assertWithinRollingWindow(scheduledStart);
    await this.assertTrainReservationRule(dto.trainReservationId);
    const unitsRequested = await this.determineUnitsRequested(dto.serviceType);
    await this.assertDailyQuotaNotExceeded(dto.carrierId, scheduledStart);

    await this.terminalClient.reserveCapacity(
      terminalCode,
      scheduledStart.toISOString(),
      unitsRequested,
    );

    let gan: string;
    try {
      const dateStr = dto.scheduledStart.substring(0, 10);
      gan = await this.terminalClient.getNextGan(terminalCode, dateStr);
    } catch (err) {
      await this.compensateRelease(
        terminalCode,
        scheduledStart,
        unitsRequested,
        'GAN generation failed',
      );
      throw err;
    }

    const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);
    try {
      const entity = this.appointmentRepo.create({
        gan,
        carrierId: dto.carrierId,
        terminalCode,
        serviceType: dto.serviceType,
        bookingNumber: dto.bookingNumber,
        trainReservationId: dto.trainReservationId ?? null,
        containerId: dto.containerId,
        scheduledStart,
        scheduledEnd,
        unitsReserved: unitsRequested,
        status: AppointmentStatus.CONFIRMED,
      });
      const saved = await this.appointmentRepo.save(entity);
      return this.toDto(saved);
    } catch (err) {
      await this.compensateRelease(
        terminalCode,
        scheduledStart,
        unitsRequested,
        'appointment persistence failed',
      );
      throw new InternalServerErrorException(
        'Failed to persist appointment after reserving capacity. The reservation has been released, please retry.',
      );
    }
  }

  async findByGan(gan: string): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentRepo.findOne({ where: { gan } });
    if (!appointment) {
      throw new NotFoundException(`Appointment with GAN '${gan}' not found`);
    }
    return this.toDto(appointment);
  }

  private assertHourAligned(scheduledStart: Date): void {
    if (
      scheduledStart.getUTCMinutes() !== 0 ||
      scheduledStart.getUTCSeconds() !== 0 ||
      scheduledStart.getUTCMilliseconds() !== 0
    ) {
      throw new BadRequestException(
        'scheduledStart must align to an hourly window boundary (minutes/seconds must be zero, e.g. 08:00:00.000Z)',
      );
    }
  }

  private async assertWithinRollingWindow(scheduledStart: Date): Promise<void> {
    const cutoffHours = await this.rulesCache.getRequiredNumber('booking.window.cutoff_hours');
    const maxDays = await this.rulesCache.getRequiredNumber('booking.window.max_days');

    const now = new Date();
    const earliestAllowed = new Date(now.getTime() + cutoffHours * 60 * 60 * 1000);

    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const latestAllowedDay = this.addBusinessDays(todayStart, maxDays);
    const latestAllowedBoundary = new Date(latestAllowedDay.getTime());
    latestAllowedBoundary.setUTCDate(latestAllowedBoundary.getUTCDate() + 1);

    if (scheduledStart < earliestAllowed) {
      throw new BookingWindowViolationException(
        `scheduledStart must be at least ${cutoffHours} hour(s) from now (earliest allowed: ${earliestAllowed.toISOString()})`,
      );
    }

    if (scheduledStart >= latestAllowedBoundary) {
      throw new BookingWindowViolationException(
        `scheduledStart exceeds the ${maxDays} business-day rolling booking window (latest allowed: ${new Date(latestAllowedBoundary.getTime() - 1).toISOString()})`,
      );
    }
  }

  private addBusinessDays(start: Date, days: number): Date {
    const result = new Date(start.getTime());
    let added = 0;

    while (added < days) {
      result.setUTCDate(result.getUTCDate() + 1);
      const dayOfWeek = result.getUTCDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }

  private async assertTrainReservationRule(
    trainReservationId: string | undefined,
  ): Promise<void> {
    const required = await this.rulesCache.getRequiredBoolean('train.reservation.required');
    if (required && (!trainReservationId || trainReservationId.trim().length === 0)) {
      throw new TrainReservationRequiredException();
    }
  }

  private async determineUnitsRequested(serviceType: ServiceType): Promise<number> {
    if (serviceType !== ServiceType.DROP_AND_PICK) {
      return 1;
    }
    const dualSlot = await this.rulesCache.getRequiredBoolean('service.drop_and_pick.dual_slot');
    return dualSlot ? 2 : 1;
  }

  private async assertDailyQuotaNotExceeded(
    carrierId: string,
    scheduledStart: Date,
  ): Promise<void> {
    const quota = await this.rulesCache.getRequiredNumber('carrier.daily_quota');

    const dayStart = new Date(
      Date.UTC(
        scheduledStart.getUTCFullYear(),
        scheduledStart.getUTCMonth(),
        scheduledStart.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart.getTime());
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const currentCount = await this.appointmentRepo.count({
      where: {
        carrierId,
        status: AppointmentStatus.CONFIRMED,
        scheduledStart: Between(dayStart, dayEnd),
      },
    });

    if (currentCount >= quota) {
      throw new DailyQuotaExceededException(carrierId, quota, currentCount);
    }
  }

  private async compensateRelease(
    terminalCode: string,
    scheduledStart: Date,
    units: number,
    reason: string,
  ): Promise<void> {
    try {
      await this.terminalClient.releaseCapacity(
        terminalCode,
        scheduledStart.toISOString(),
        units,
      );
      this.logger.warn(
        `Compensated: released ${units} unit(s) for ${terminalCode} @ ${scheduledStart.toISOString()} after ${reason}`,
      );
    } catch (releaseErr) {
      this.logger.error(
        `CRITICAL: failed to release capacity after ${reason} - manual reconciliation required for ${terminalCode} @ ${scheduledStart.toISOString()}`,
        releaseErr as Error,
      );
    }
  }

  private toDto(appointment: Appointment): AppointmentResponseDto {
    return {
      gan: appointment.gan,
      carrierId: appointment.carrierId,
      terminalCode: appointment.terminalCode,
      serviceType: appointment.serviceType,
      bookingNumber: appointment.bookingNumber,
      trainReservationId: appointment.trainReservationId ?? null,
      containerId: appointment.containerId,
      scheduledStart: appointment.scheduledStart.toISOString(),
      scheduledEnd: appointment.scheduledEnd.toISOString(),
      unitsReserved: appointment.unitsReserved,
      status: appointment.status,
      createdAt: appointment.createdAt.toISOString(),
    };
  }
}