import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryEventsListener } from './inventory.events.listener';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryEventsListener],
  exports: [InventoryService],
})
export class InventoryModule {}
