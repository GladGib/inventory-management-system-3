import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemGroupsModule } from './item-groups/item-groups.module';

@Module({
  imports: [ItemGroupsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, ItemGroupsModule],
})
export class ItemsModule {}
