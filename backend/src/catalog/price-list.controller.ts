import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PriceListService } from './price-list.service';
import { CreatePriceListDto, CreatePriceListItemDto, PriceListLookupQueryDto } from './dto/price-list.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Price Lists')
@ApiBearerAuth()
@Controller('price-lists')
export class PriceListController {
  constructor(private service: PriceListService) {}

  @Get()
  @RequirePermissions('catalog.pricelist.view')
  @ApiOperation({ summary: 'List all price lists' })
  list() {
    return this.service.listPriceLists();
  }

  // IMPORTANT: 'lookup' must be declared BEFORE ':id' to avoid NestJS matching 'lookup' as id param
  @Get('lookup')
  @RequirePermissions('catalog.pricelist.view')
  @ApiOperation({ summary: 'Lookup best price for product + customer context' })
  lookup(@Query() query: PriceListLookupQueryDto) {
    return this.service.lookupPrice(query);
  }

  @Get(':id')
  @RequirePermissions('catalog.pricelist.view')
  @ApiOperation({ summary: 'Get price list detail with items' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPriceList(id);
  }

  @Post()
  @RequirePermissions('catalog.pricelist.manage')
  @ApiOperation({ summary: 'Create price list' })
  create(@Body() dto: CreatePriceListDto) {
    return this.service.createPriceList(dto);
  }

  @Patch(':id')
  @RequirePermissions('catalog.pricelist.manage')
  @ApiOperation({ summary: 'Update price list header' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePriceListDto>,
  ) {
    return this.service.updatePriceList(id, dto);
  }

  @Post(':id/items')
  @RequirePermissions('catalog.pricelist.manage')
  @ApiOperation({ summary: 'Add or update product item in price list (upsert by productId)' })
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePriceListItemDto,
  ) {
    return this.service.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('catalog.pricelist.manage')
  @ApiOperation({ summary: 'Remove product item from price list' })
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.removeItem(id, itemId);
  }
}
