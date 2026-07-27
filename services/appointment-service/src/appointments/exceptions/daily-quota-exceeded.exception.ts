import { HttpException, HttpStatus } from '@nestjs/common';

export class DailyQuotaExceededException extends HttpException {
  constructor(carrierId: string, quota: number, currentCount: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'DAILY_QUOTA_EXCEEDED',
        message: `Carrier '${carrierId}' has ${currentCount} active appointment(s) for this day, which meets or exceeds the daily quota of ${quota}`,
      },
      HttpStatus.CONFLICT,
    );
  }
}