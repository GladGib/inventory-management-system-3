import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentGatewayController } from './payment-gateway.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { FpxProvider } from './fpx/fpx.provider';
import { DuitNowProvider } from './duitnow/duitnow.provider';
import { GrabPayProvider } from './grabpay/grabpay.provider';
import { TngProvider } from './tng/tng.provider';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentGatewayController],
  providers: [
    PaymentGatewayService,
    FpxProvider,
    DuitNowProvider,
    GrabPayProvider,
    TngProvider,
  ],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
