import { Controller, Get } from '@nestjs/common';

/**
 * Minimal health for a service with no DB. Liveness == readiness here since
 * the only dependency (RabbitMQ) is consumed passively; the process being up
 * is enough for K8s to route nothing to it anyway (no inbound HTTP traffic).
 */
@Controller('health')
export class HealthController {
  @Get()
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    return { status: 'ok' };
  }
}
