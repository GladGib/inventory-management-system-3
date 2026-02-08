import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MonitoringService } from './modules/monitoring/monitoring.service';
import { GlobalExceptionFilter } from './modules/monitoring/http-exception.filter';
import { AuditInterceptor } from './modules/audit/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global Exception Filter (with monitoring integration)
  const monitoringService = app.get(MonitoringService);
  app.useGlobalFilters(new GlobalExceptionFilter(monitoringService));

  // Global Audit Interceptor (auto-captures mutations)
  const auditInterceptor = app.get(AuditInterceptor);
  app.useGlobalInterceptors(auditInterceptor);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('IMS API')
      .setDescription(
        'Inventory Management System API for Malaysian SMEs - Auto Parts, Hardware & Spare Parts Wholesalers'
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Organizations', 'Organization management')
      .addTag('Users', 'User management')
      .addTag('Items', 'Item/Product management')
      .addTag('Inventory', 'Inventory and stock management')
      .addTag('Sales', 'Sales orders, invoices, payments')
      .addTag('Purchases', 'Purchase orders, bills, payments')
      .addTag('Contacts', 'Customer and vendor management')
      .addTag('Reports', 'Reports and analytics')
      .addTag('Settings', 'System settings and configuration')
      .addTag('Audit', 'Audit log endpoints')
      .addTag('Backup', 'Backup and restore endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   IMS API Server Started Successfully!                    ║
║                                                           ║
║   Environment: ${configService.get('NODE_ENV', 'development').padEnd(40)}║
║   Port: ${port.toString().padEnd(48)}║
║   API Docs: http://localhost:${port}/api/docs${' '.repeat(24)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
