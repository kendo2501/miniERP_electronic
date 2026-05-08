import { Controller, Get, Post, Param, ParseIntPipe, Query, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockInquiryService } from './stock-inquiry.service';
import { CreateStockInquiryDto, RespondStockInquiryDto, StockInquiryQueryDto } from './stock-inquiry.dto';
import { RequirePermissions, AnyPermission } from '../common/decorators/permissions.decorator';

@ApiTags('Stock Inquiries')
@ApiBearerAuth()
@Controller('stock-inquiries')
export class StockInquiryController {
  constructor(private service: StockInquiryService) {}

  @Get() @AnyPermission('inventory.stock.request', 'inventory.stock.respond') @ApiOperation({ summary: 'List stock inquiries' })
  list(@Query() query: StockInquiryQueryDto, @Req() req: any) { return this.service.listInquiries(query, req.user); }

  @Get(':id') @AnyPermission('inventory.stock.request', 'inventory.stock.respond') @ApiOperation({ summary: 'Get inquiry detail' })
  get(@Param('id', ParseIntPipe) id: number) { return this.service.getInquiry(id); }

  @Post() @RequirePermissions('inventory.stock.request') @ApiOperation({ summary: 'Sales creates stock inquiry' })
  create(@Body() dto: CreateStockInquiryDto, @Req() req: any) { return this.service.createInquiry(dto, req.user); }

  @Post(':id/respond') @HttpCode(HttpStatus.OK) @RequirePermissions('inventory.stock.respond') @ApiOperation({ summary: 'Warehouse responds to inquiry' })
  respond(@Param('id', ParseIntPipe) id: number, @Body() dto: RespondStockInquiryDto, @Req() req: any) {
    return this.service.respondToInquiry(id, dto, req.user);
  }
}
