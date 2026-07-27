import { HttpException, HttpStatus } from '@nestjs/common';

export class TrainReservationRequiredException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'TRAIN_RESERVATION_REQUIRED',
        message: 'A valid trainReservationId is required to submit this appointment',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}