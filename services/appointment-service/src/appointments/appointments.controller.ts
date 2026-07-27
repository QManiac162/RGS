import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    return this.appointmentsService.createAppointment(dto);
  }

  @Get(':gan')
  findByGan(@Param('gan') gan: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findByGan(gan);
  }
}