import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getInfo() {
    return {
      name: 'IMS API',
      description:
        'Inventory Management System for Malaysian SMEs - Auto Parts, Hardware & Spare Parts Wholesalers',
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      documentation: '/api/docs',
    };
  }

  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
