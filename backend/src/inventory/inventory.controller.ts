import {
  Controller, Get, Post, Patch, Body, Param,
  ParseIntPipe, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { AdjustStockDto, TransferStockDto } from './dto/adjustment.dto';
import { StockQueryDto, TransactionQueryDto } from './dto/stock-query.dto';
import {
  CreateReplenishmentDto,
  UpdateReplenishmentDto,
  ReplenishmentQueryDto,
} from './dto/replenishment.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  // ─── Warehouses ───────────────────────────────────────────────────────────

  @Get('warehouses')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'List warehouses' })
  getWarehouses() {
    return this.service.getWarehouses();
  }

  @Get('warehouses/:id')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'Get warehouse detail' })
  getWarehouse(@Param('id', ParseIntPipe) id: number) {
    return this.service.getWarehouse(id);
  }

  @Post('warehouses')
  @RequirePermissions('inventory.warehouse.manage')
  @ApiOperation({ summary: 'Create warehouse' })
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory.warehouse.manage')
  @ApiOperation({ summary: 'Update warehouse' })
  updateWarehouse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.service.updateWarehouse(id, dto);
  }

  // ─── Product Search ───────────────────────────────────────────────────────

  @Get('products/search')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'Smart product search with stock info' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  searchProducts(
    @Query('q') q: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.searchProducts(q, warehouseId ? parseInt(warehouseId, 10) : undefined);
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────

  @Get('stocks')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'List inventory stocks (paginated)' })
  getStocks(@Query() query: StockQueryDto) {
    return this.service.getStocks(query);
  }

  @Get('stocks/low-stock')
  @RequirePermissions('inventory.low_stock.view')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  getLowStock(@Query('threshold') threshold?: string) {
    return this.service.getLowStockAlerts(threshold ? parseInt(threshold, 10) : 10);
  }

  // ─── Adjustments ──────────────────────────────────────────────────────────

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Adjust stock with type (IN/OUT/DAMAGE/RETURN/CORRECTION)' })
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    return this.service.adjustStock(dto, user.id);
  }

  // ─── Transfers ────────────────────────────────────────────────────────────

  @Post('transfers')
  @RequirePermissions('inventory.transfer')
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @HttpCode(HttpStatus.OK)
  transferStock(@Body() dto: TransferStockDto, @CurrentUser() user: AuthUser) {
    return this.service.transferStock(dto, user.id);
  }

  // ─── Replenishment ────────────────────────────────────────────────────────

  @Get('replenishment')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'List replenishment requests' })
  listReplenishment(@Query() query: ReplenishmentQueryDto) {
    return this.service.listReplenishment(query);
  }

  @Post('replenishment')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Create replenishment request' })
  createReplenishment(@Body() dto: CreateReplenishmentDto, @CurrentUser() user: AuthUser) {
    return this.service.createReplenishment(dto, user.id);
  }

  @Patch('replenishment/:id')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Update replenishment request status / assignment' })
  updateReplenishment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReplenishmentDto,
  ) {
    return this.service.updateReplenishment(id, dto);
  }

  // ─── Transaction History ──────────────────────────────────────────────────

  @Get('transactions')
  @RequirePermissions('inventory.stock.view')
  @ApiOperation({ summary: 'List inventory transaction history' })
  getTransactions(@Query() query: TransactionQueryDto) {
    return this.service.getTransactions(query);
  }
}
