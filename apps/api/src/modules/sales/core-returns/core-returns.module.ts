import { Module } from '@nestjs/common';
import { CoreReturnsController } from './core-returns.controller';
import { CoreReturnsService } from './core-returns.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoreReturnsController],
  providers: [CoreReturnsService],
  exports: [CoreReturnsService],
})
export class CoreReturnsModule {}
