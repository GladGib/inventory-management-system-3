import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Core Modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

// Phase 2: Core Modules
import { CategoriesModule } from './modules/categories/categories.module';
import { ItemsModule } from './modules/items/items.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ContactsModule } from './modules/contacts/contacts.module';

// Phase 3: Transaction Modules
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';

// Phase 4: Compliance Modules
import { TaxModule } from './modules/tax/tax.module';
import { EInvoiceModule } from './modules/einvoice/einvoice.module';

// Settings Modules
import { PaymentTermsModule } from './modules/settings/payment-terms/payment-terms.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';

// Phase 5: Reports & Dashboard
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

// Phase 6: Email Notifications
import { EmailModule } from './modules/email/email.module';

// Phase 7: Composite Items & Reorder Automation
import { CompositeModule } from './modules/composite/composite.module';
import { ReorderModule } from './modules/reorder/reorder.module';

// Phase 8: Accounting
import { AccountingModule } from './modules/accounting/accounting.module';

// Phase 9: Portals
import { PortalAuthModule } from './modules/portal/portal-auth/portal-auth.module';
import { CustomerPortalModule } from './modules/portal/customer-portal/customer-portal.module';
import { VendorPortalModule } from './modules/portal/vendor-portal/vendor-portal.module';

// Phase 10: Banking
import { BankingModule } from './modules/banking/banking.module';

// Phase 11: Online Payment Gateway
import { PaymentGatewayModule } from './modules/payments/gateway/payment-gateway.module';

// Phase 12: Background Job Queue
import { QueueModule } from './modules/queue/queue.module';

// Phase 13: Caching
import { AppCacheModule } from './modules/cache/cache.module';

// Phase 14: Security, Audit, Backup, Monitoring
import { AuditModule } from './modules/audit/audit.module';
import { SecurityModule } from './modules/security/security.module';
import { BackupModule } from './modules/backup/backup.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

// Phase 15: Full-Text Search (Elasticsearch with database fallback)
import { SearchModule } from './modules/search/search.module';

// Phase 16: Mobile Push Notifications
import { NotificationsModule } from './modules/notifications/notifications.module';

// App Controller for health check
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60000), // 1 minute
          limit: config.get('THROTTLE_LIMIT', 100), // 100 requests per minute
        },
      ],
    }),

    // Database
    PrismaModule,

    // Core Modules
    AuthModule,
    UsersModule,
    OrganizationsModule,

    // Phase 2: Core Modules
    CategoriesModule,
    ItemsModule,
    WarehousesModule,
    InventoryModule,
    ContactsModule,

    // Phase 3: Transaction Modules
    SalesModule,
    PurchasesModule,

    // Phase 4: Compliance Modules
    TaxModule,
    EInvoiceModule,

    // Phase 5: Reports & Dashboard
    ReportsModule,
    DashboardModule,

    // Settings Modules
    PaymentTermsModule,
    PriceListsModule,

    // Phase 6: Email Notifications
    EmailModule,

    // Phase 7: Composite Items & Reorder Automation
    CompositeModule,
    ReorderModule,

    // Phase 8: Accounting
    AccountingModule,

    // Phase 9: Portals
    PortalAuthModule,
    CustomerPortalModule,
    VendorPortalModule,

    // Phase 10: Banking
    BankingModule,

    // Phase 11: Online Payment Gateway
    PaymentGatewayModule,

    // Phase 12: Background Job Queue (BullMQ + Redis)
    QueueModule,

    // Phase 13: Caching (in-memory, Redis-ready)
    AppCacheModule,

    // Phase 14: Security, Audit, Backup, Monitoring
    AuditModule,
    SecurityModule,
    BackupModule,
    MonitoringModule,

    // Phase 15: Full-Text Search (Elasticsearch with database fallback)
    SearchModule,

    // Phase 16: Mobile Push Notifications
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
