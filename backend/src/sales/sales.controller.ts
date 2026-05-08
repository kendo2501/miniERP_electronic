import { Controller, Get, Post, Patch, Param, ParseIntPipe, Query, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import {
  CreateQuotationDto, QuotationQueryDto,
  CreateSalesOrderDto, SalesOrderQueryDto,
  CreateDeliveryDto, DeliveryQueryDto, MarkDeliveryFailedDto,
  SubmitCounterOfferDto,
} from './dto/sales.dto';
import { RequirePermissions, AnyPermission } from '../common/decorators/permissions.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private service: SalesService) {}

  // ─── Quotations ───────────────────────────────────────────────────────────

  @Get('quotations') @AnyPermission('sales.quotation.create', 'sales.quotation.approve', 'sales.quotation.view_own') @ApiOperation({ summary: 'List quotations' })
  listQuotations(@Query() query: QuotationQueryDto) { return this.service.listQuotations(query); }

  @Get('quotations/:id') @AnyPermission('sales.quotation.create', 'sales.quotation.approve', 'sales.quotation.view_own') @ApiOperation({ summary: 'Get quotation' })
  getQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.getQuotation(id); }

  @Post('quotations') @RequirePermissions('sales.quotation.create') @ApiOperation({ summary: 'Create quotation' })
  createQuotation(@Body() dto: CreateQuotationDto) { return this.service.createQuotation(dto); }

  @Post('quotations/:id/send') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Send quotation to customer' })
  sendQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.sendQuotation(id); }

  @Post('quotations/:id/confirm') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Confirm quotation → creates sales order' })
  confirmQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.confirmQuotation(id); }

  @Post('quotations/:id/cancel') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Cancel quotation' })
  cancelQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.cancelQuotation(id); }

  @Post('quotations/:id/counter-offer') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Submit customer counter offer' })
  submitCounterOffer(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitCounterOfferDto) { return this.service.submitCounterOffer(id, dto); }

  @Post('quotations/:id/accept-offer') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Admin accepts counter offer → creates order' })
  acceptCounterOffer(@Param('id', ParseIntPipe) id: number) { return this.service.acceptCounterOffer(id); }

  @Post('quotations/:id/reject-offer') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Admin rejects counter offer' })
  rejectCounterOffer(@Param('id', ParseIntPipe) id: number) { return this.service.rejectCounterOffer(id); }

  // ─── Sales Orders ─────────────────────────────────────────────────────────

  @Get('orders') @AnyPermission('sales.order.view_all', 'sales.order.view_team', 'sales.order.view_assigned', 'sales.order.view_own') @ApiOperation({ summary: 'List sales orders' })
  listOrders(@Query() query: SalesOrderQueryDto, @Req() req: any) { return this.service.listOrders(query, req.user); }

  @Get('orders/:id') @AnyPermission('sales.order.view_all', 'sales.order.view_team', 'sales.order.view_assigned', 'sales.order.view_own') @ApiOperation({ summary: 'Get sales order' })
  getOrder(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.getOrder(id, req.user); }

  @Post('orders') @RequirePermissions('sales.order.create') @ApiOperation({ summary: 'Create sales order directly' })
  createOrder(@Body() dto: CreateSalesOrderDto) { return this.service.createOrder(dto); }

  @Post('orders/:id/confirm') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.approve') @ApiOperation({ summary: 'Confirm order' })
  confirmOrder(@Param('id', ParseIntPipe) id: number) { return this.service.confirmOrder(id); }

  @Post('orders/:id/cancel') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.cancel') @ApiOperation({ summary: 'Cancel order' })
  cancelOrder(@Param('id', ParseIntPipe) id: number) { return this.service.cancelOrder(id); }

  // ─── Deliveries ───────────────────────────────────────────────────────────

  @Get('deliveries') @AnyPermission('sales.delivery.view', 'sales.delivery.view_own') @ApiOperation({ summary: 'List deliveries' })
  listDeliveries(@Query() query: DeliveryQueryDto, @Req() req: any) { return this.service.listDeliveries(query, req.user); }

  @Post('deliveries') @RequirePermissions('sales.order.create') @ApiOperation({ summary: 'Create delivery from order' })
  createDelivery(@Body() dto: CreateDeliveryDto) { return this.service.createDelivery(dto); }

  @Post('deliveries/:id/deliver') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.create') @ApiOperation({ summary: 'Mark delivery as delivered' })
  markDelivered(@Param('id', ParseIntPipe) id: number) { return this.service.markDelivered(id); }

  @Patch('deliveries/:id/fail') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.create') @ApiOperation({ summary: 'Mark delivery as failed' })
  markFailed(@Param('id', ParseIntPipe) id: number, @Body() dto: MarkDeliveryFailedDto) { return this.service.markFailed(id, dto); }

  // ─── Customer balance ─────────────────────────────────────────────────────

  @Get('customers/:id/balance') @AnyPermission('customer.view_assigned', 'customers.customer.view') @ApiOperation({ summary: 'Get customer outstanding balance and invoices' })
  getCustomerBalance(@Param('id', ParseIntPipe) id: number) { return this.service.getCustomerBalance(id); }
}
