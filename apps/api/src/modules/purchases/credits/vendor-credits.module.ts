import { Module } from '@nestjs/common';
import { VendorCreditsController } from './vendor-credits.controller';
import { VendorCreditsService } from './vendor-credits.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorCreditsController],
  providers: [VendorCreditsService],
  exports: [VendorCreditsService],
})
export class VendorCreditsModule {}
