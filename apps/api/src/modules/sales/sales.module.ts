import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesReturnsModule } from './returns/sales-returns.module';
import { QuotesModule } from './quotes/quotes.module';
import { CoreReturnsModule } from './core-returns/core-returns.module';
import { TaxModule } from '@/modules/tax/tax.module';

@Module({
  imports: [SalesReturnsModule, QuotesModule, CoreReturnsModule, TaxModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
