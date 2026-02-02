import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

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
