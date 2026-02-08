import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search.service';
import { ItemSearchService } from './item-search.service';
import { ContactSearchService } from './contact-search.service';
import { SearchController } from './search.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, ItemSearchService, ContactSearchService],
  exports: [SearchService, ItemSearchService, ContactSearchService],
})
export class SearchModule {}
