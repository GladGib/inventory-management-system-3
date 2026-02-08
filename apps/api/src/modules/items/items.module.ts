import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemGroupsModule } from './item-groups/item-groups.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [ItemGroupsModule, VehiclesModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, ItemGroupsModule, VehiclesModule],
})
export class ItemsModule {}
