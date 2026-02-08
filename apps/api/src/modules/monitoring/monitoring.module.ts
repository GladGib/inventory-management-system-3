import { Module, Global } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { HealthController } from './health.controller';
import { GlobalExceptionFilter } from './http-exception.filter';

@Global()
@Module({
  controllers: [HealthController],
  providers: [MonitoringService, GlobalExceptionFilter],
  exports: [MonitoringService, GlobalExceptionFilter],
})
export class MonitoringModule {}
