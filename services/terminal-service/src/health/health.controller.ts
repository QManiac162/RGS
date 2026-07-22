import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}

@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'terminal-service',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}