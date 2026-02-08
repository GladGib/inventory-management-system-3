import { Module } from '@nestjs/common';
import { CompositeController } from './composite.controller';
import { CompositeService } from './composite.service';

@Module({
  controllers: [CompositeController],
  providers: [CompositeService],
  exports: [CompositeService],
})
export class CompositeModule {}
