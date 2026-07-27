import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import {ServiceType} from './service-type.enum';
import { AppointmentStatus} from './appointment-status.enum';

@Entity()
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({type: 'varchar', length: 40, unique: true})
    gan!: string;

    @Column({name: 'carrier_id', type: 'varchar', length: 50})
    carrierId!: string;

    @Column({name: 'terminal_code', type: 'varchar', length: 10})
    terminalCode!: string;

    @Column({name: 'service_type', type: 'enum', enum: ServiceType})
    serviceType!: ServiceType;

    @Column({name: 'booking_number', type: 'varchar', length: 50})
    bookingNumber!: string;

    @Column({name: 'train_reservation_id', type: 'varchar', length: 50, nullable: true})
    trainReservationId?: string | null;

    @Column({name: 'container_id', type: 'varchar', length: 50})
    containerId!: string;

    @Column({name: 'scheduled_start', type: 'timestamp'})
    scheduledStart!: Date;

    @Column({name: 'scheduled_end', type: 'timestamp'})
    scheduledEnd!: Date;

    @Column({name: 'units_reserved', type: 'int'})
    unitsReserved!: number;

    @Column({type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.CONFIRMED})
    status!: AppointmentStatus;

    @CreateDateColumn({name: 'created_at', type: 'timestamptz'})
    createdAt!: Date;

    @UpdateDateColumn({name: 'updated_at', type: 'timestamptz'})
    updatedAt!: Date;
}