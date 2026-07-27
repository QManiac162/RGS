import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ServiceType } from '../../database/entities/service-type.enum';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  carrierId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  terminalCode!: string;

  @IsEnum(ServiceType, {
    message: 'serviceType must be one of DROP_OFF, PICK_UP, DROP_AND_PICK',
  })
  serviceType!: ServiceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bookingNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  trainReservationId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  containerId!: string;

  @IsISO8601({ strict: true }, { message: 'scheduledStart must be a valid ISO8601 datetime string' })
  scheduledStart!: string;
}