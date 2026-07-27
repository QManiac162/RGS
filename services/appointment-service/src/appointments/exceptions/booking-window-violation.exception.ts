import { HttpException, HttpStatus } from '@nestjs/common';

export class BookingWindowViolationException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'BOOKING_WINDOW_VIOLATION',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}