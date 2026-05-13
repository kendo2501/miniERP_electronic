import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PriceListController } from './price-list.controller';
import { PriceListService } from './price-list.service';

@Module({
  controllers: [CatalogController, PriceListController],
  providers: [CatalogService, PriceListService],
  exports: [CatalogService, PriceListService],
})
export class CatalogModule {}
