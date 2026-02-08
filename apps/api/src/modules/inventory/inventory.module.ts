import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { SerialController } from './serial.controller';
import { SerialService } from './serial.service';

@Module({
  controllers: [InventoryController, BatchController, SerialController],
  providers: [InventoryService, BatchService, SerialService],
  exports: [InventoryService, BatchService, SerialService],
})
export class InventoryModule {}
