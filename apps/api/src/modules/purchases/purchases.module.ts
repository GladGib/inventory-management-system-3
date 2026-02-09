import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { VendorCreditsModule } from './credits/vendor-credits.module';
import { TaxModule } from '@/modules/tax/tax.module';

@Module({
  imports: [VendorCreditsModule, TaxModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
