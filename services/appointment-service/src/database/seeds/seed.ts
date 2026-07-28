import { AppDataSource } from '../data-source';
import { Appointment } from '../entities/appointment.entity';
import { ServiceType } from '../entities/service-type.enum';
import { AppointmentStatus } from '../entities/appointment-status.enum';

async function seedAppointments(): Promise<void> {
    const repo = AppDataSource.getRepository(Appointment);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(tomorrow);
    windowStart.setUTCHours(10, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setUTCHours(11, 0, 0, 0);

    const seedAppointment = {
        id: '00000000-0000-0000-0000-000000000001',
        gan: 'GAN-0001',
        carrierId: 'CARRIER-001',
        terminalCode: 'IRN',
        serviceType: ServiceType.DROP_OFF,
        bookingNumber: 'BOOKING-001',
        trainReservationId: null,
        containerId: 'CONT-001',
        scheduledStart: windowStart,
        scheduledEnd: windowEnd,
        unitsReserved: 1,
        status: AppointmentStatus.CONFIRMED,
    };

    const existing = await repo.findOne({
        where: {
            bookingNumber: seedAppointment.bookingNumber,
        },
    });

    if (existing) {
        console.log('[seed] appointment already exists, skipping');
        return;
    }

    await repo.save(repo.create(seedAppointment));
    console.log('[seed] inserted appointment BOOKING-001');
}

async function run(): Promise<void> {
    await AppDataSource.initialize();
    console.log('[seed] data source initialized');

    await AppDataSource.runMigrations();
    console.log('[seed] migrations applied');

    await seedAppointments();

    await AppDataSource.destroy();
    console.log('[seed] complete, connection closed');
}

run().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
});
