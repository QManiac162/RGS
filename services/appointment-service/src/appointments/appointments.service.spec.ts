import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentStatus } from '../database/entities/appointment-status.enum';
import { ServiceType } from '../database/entities/service-type.enum';
import { TerminalClientService } from '../terminal-client/terminal-client.service';
import { RulesCacheService } from '../rules-cache/rules-cache.service';
import { BookingWindowViolationException } from './exceptions/booking-window-violation.exception';
import { DailyQuotaExceededException } from './exceptions/daily-quota-exceeded.exception';
import { TrainReservationRequiredException } from './exceptions/train-reservation-required.exception';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
  };
  let terminalClient: {
    reserveCapacity: jest.Mock;
    releaseCapacity: jest.Mock;
    getNextGan: jest.Mock;
  };
  let rulesCache: {
    getRequiredNumber: jest.Mock;
    getRequiredBoolean: jest.Mock;
  };

  const RULES: Record<string, number | boolean> = {
    'booking.window.cutoff_hours': 2,
    'booking.window.max_days': 3,
    'train.reservation.required': true,
    'service.drop_and_pick.dual_slot': true,
    'carrier.daily_quota': 10,
  };

  function hoursFromNow(hours: number): Date {
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    d.setUTCHours(d.getUTCHours() + hours);
    return d;
  }

  const baseDto = {
    carrierId: 'CARRIER-1',
    terminalCode: 'IRN',
    serviceType: ServiceType.DROP_OFF,
    bookingNumber: 'BK-100',
    trainReservationId: 'TRN-500',
    containerId: 'CNT-900',
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockImplementation(async (v) => ({
        ...v,
        id: 'uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
    };

    terminalClient = {
      reserveCapacity: jest.fn().mockResolvedValue({}),
      releaseCapacity: jest.fn().mockResolvedValue({}),
      getNextGan: jest.fn().mockResolvedValue('GAN-IRN-20260720-000001'),
    };

    rulesCache = {
      getRequiredNumber: jest.fn((key: string) => Promise.resolve(RULES[key] as number)),
      getRequiredBoolean: jest.fn((key: string) => Promise.resolve(RULES[key] as boolean)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: getRepositoryToken(Appointment), useValue: repo },
        { provide: TerminalClientService, useValue: terminalClient },
        { provide: RulesCacheService, useValue: rulesCache },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('confirms an appointment on the happy path', async () => {
    const dto = { ...baseDto, scheduledStart: hoursFromNow(5).toISOString() };
    const result = await service.createAppointment(dto as any);

    expect(result.gan).toBe('GAN-IRN-20260720-000001');
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    expect(result.unitsReserved).toBe(1);
    expect(terminalClient.reserveCapacity).toHaveBeenCalledWith('IRN', dto.scheduledStart, 1);
  });

  it('requests 2 units for DROP_AND_PICK when dual_slot is true', async () => {
    const dto = {
      ...baseDto,
      serviceType: ServiceType.DROP_AND_PICK,
      scheduledStart: hoursFromNow(5).toISOString(),
    };

    await service.createAppointment(dto as any);
    expect(terminalClient.reserveCapacity).toHaveBeenCalledWith('IRN', dto.scheduledStart, 2);
  });

  it('rejects a scheduledStart that is not hour-aligned', async () => {
    const notAligned = hoursFromNow(5);
    notAligned.setUTCMinutes(15);

    const dto = { ...baseDto, scheduledStart: notAligned.toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      'hourly window boundary',
    );
  });

  it('rejects a scheduledStart inside the cutoff window', async () => {
    const dto = { ...baseDto, scheduledStart: hoursFromNow(1).toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      BookingWindowViolationException,
    );
  });

  it('rejects a scheduledStart beyond the max rolling business-day window', async () => {
    const dto = { ...baseDto, scheduledStart: hoursFromNow(24 * 10).toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      BookingWindowViolationException,
    );
  });

  it('rejects when trainReservationId is missing and the rule requires it', async () => {
    const dto = {
      ...baseDto,
      trainReservationId: undefined,
      scheduledStart: hoursFromNow(5).toISOString(),
    };

    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      TrainReservationRequiredException,
    );
  });

  it('rejects when the carrier has met their daily quota', async () => {
    repo.count.mockResolvedValue(10);

    const dto = { ...baseDto, scheduledStart: hoursFromNow(5).toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      DailyQuotaExceededException,
    );
    expect(terminalClient.reserveCapacity).not.toHaveBeenCalled();
  });

  it('compensates by releasing capacity when GAN generation fails', async () => {
    terminalClient.getNextGan.mockRejectedValue(new Error('gan service down'));

    const dto = { ...baseDto, scheduledStart: hoursFromNow(5).toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow('gan service down');
    expect(terminalClient.releaseCapacity).toHaveBeenCalledWith('IRN', dto.scheduledStart, 1);
  });

  it('compensates by releasing capacity when the local DB save fails', async () => {
    repo.save.mockRejectedValue(new Error('db write failed'));

    const dto = { ...baseDto, scheduledStart: hoursFromNow(5).toISOString() };
    await expect(service.createAppointment(dto as any)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(terminalClient.releaseCapacity).toHaveBeenCalledWith('IRN', dto.scheduledStart, 1);
  });

  describe('findByGan', () => {
    it('returns a mapped DTO when the appointment exists', async () => {
      repo.findOne.mockResolvedValue({
        gan: 'GAN-IRN-20260720-000001',
        carrierId: 'CARRIER-1',
        terminalCode: 'IRN',
        serviceType: ServiceType.DROP_OFF,
        bookingNumber: 'BK-100',
        trainReservationId: 'TRN-500',
        containerId: 'CNT-900',
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        unitsReserved: 1,
        status: AppointmentStatus.CONFIRMED,
        createdAt: new Date(),
      });

      const result = await service.findByGan('GAN-IRN-20260720-000001');
      expect(result.gan).toBe('GAN-IRN-20260720-000001');
    });

    it('throws NotFoundException when no appointment matches the GAN', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByGan('GAN-NONEXISTENT')).rejects.toThrow('not found');
    });
  });
});