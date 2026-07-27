import { ServiceType } from '../../database/entities/service-type.enum';
import { AppointmentStatus } from '../../database/entities/appointment-status.enum';

export class AppointmentResponseDto {
  gan!: string;
  carrierId!: string;
  terminalCode!: string;
  serviceType!: ServiceType;
  bookingNumber!: string;
  trainReservationId!: string | null;
  containerId!: string;
  scheduledStart!: string;
  scheduledEnd!: string;
  unitsReserved!: number;
  status!: AppointmentStatus;
  createdAt!: string;
}