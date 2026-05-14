import { Controller, Get, Post, Param, ParseIntPipe, Query, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import {
  CreateQuotationDto, QuotationQueryDto,
  CreateSalesOrderDto, SalesOrderQueryDto,
  SubmitCounterOfferDto,
  CancelWithReasonDto, RequestRevisionDto, UpdateQuotationItemsDto,
  RequestPriceAdjustmentDto, AdjustOrderPricesDto,
} from './dto/sales.dto';
import { RequirePermissions, AnyPermission } from '../common/decorators/permissions.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private service: SalesService) {}

  // ─── Quotations ───────────────────────────────────────────────────────────

  @Get('quotations') @AnyPermission('sales.quotation.create', 'sales.quotation.approve', 'sales.quotation.view_own') @ApiOperation({ summary: 'List quotations' })
  listQuotations(@Query() query: QuotationQueryDto, @Req() req: any) { return this.service.listQuotations(query, req.user); }

  @Get('quotations/:id') @AnyPermission('sales.quotation.create', 'sales.quotation.approve', 'sales.quotation.view_own') @ApiOperation({ summary: 'Get quotation' })
  getQuotation(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.getQuotation(id, req.user); }

  @Post('quotations') @RequirePermissions('sales.quotation.create') @ApiOperation({ summary: 'Create quotation' })
  createQuotation(@Body() dto: CreateQuotationDto, @Req() req: any) {
    dto.salesUserId = req.user?.id ?? undefined;
    return this.service.createQuotation(dto);
  }

  @Post('quotations/:id/send') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Send quotation to customer' })
  sendQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.sendQuotation(id); }

  @Post('quotations/:id/confirm') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Confirm quotation → auto-creates sales order' })
  confirmQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.confirmQuotation(id); }

  @Post('quotations/:id/cancel') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Cancel quotation' })
  cancelQuotation(@Param('id', ParseIntPipe) id: number) { return this.service.cancelQuotation(id); }

  @Post('quotations/:id/counter-offer') @HttpCode(HttpStatus.OK) @AnyPermission('sales.quotation.update_own', 'sales.quotation.view_own') @ApiOperation({ summary: 'Submit customer counter offer' })
  submitCounterOffer(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitCounterOfferDto, @Req() req: any) { return this.service.submitCounterOffer(id, dto, req.user); }

  @Post('quotations/:id/accept-offer') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Admin accepts counter offer → creates order' })
  acceptCounterOffer(@Param('id', ParseIntPipe) id: number) { return this.service.acceptCounterOffer(id); }

  @Post('quotations/:id/reject-offer') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Admin rejects counter offer' })
  rejectCounterOffer(@Param('id', ParseIntPipe) id: number) { return this.service.rejectCounterOffer(id); }

  @Post('quotations/:id/approve') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Manager approves quotation' })
  approveQuotation(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.approveQuotation(id, req.user?.id); }

  @Post('quotations/:id/request-revision') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.approve') @ApiOperation({ summary: 'Manager requests revision with reason' })
  requestRevision(@Param('id', ParseIntPipe) id: number, @Body() dto: RequestRevisionDto) { return this.service.requestRevision(id, dto); }

  @Post('quotations/:id/cancel-with-reason') @HttpCode(HttpStatus.OK) @AnyPermission('sales.quotation.approve', 'sales.quotation.update_own') @ApiOperation({ summary: 'Cancel quotation with reason' })
  cancelWithReason(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelWithReasonDto) { return this.service.cancelWithReason(id, dto); }

  @Post('quotations/:id/resubmit') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.quotation.update_own') @ApiOperation({ summary: 'Sale resubmits quotation after revision request' })
  resubmitQuotation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuotationItemsDto) { return this.service.resubmitQuotation(id, dto); }

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

  @Post('orders/:id/confirm-payment') @HttpCode(HttpStatus.OK) @AnyPermission('sales.order.approve', 'sales.order.create') @ApiOperation({ summary: 'Confirm order payment (Manager or Saler)' })
  confirmPayment(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.confirmPayment(id, req.user?.id); }

  @Post('orders/:id/request-price-adjustment') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.approve') @ApiOperation({ summary: 'Manager requests price adjustment — sets PRICE_ADJUSTMENT_REQUESTED' })
  requestPriceAdjustment(@Param('id', ParseIntPipe) id: number, @Body() dto: RequestPriceAdjustmentDto, @Req() req: any) { return this.service.requestPriceAdjustment(id, dto, req.user?.id); }

  @Post('orders/:id/adjust-prices') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.create') @ApiOperation({ summary: 'Saler adjusts prices → PENDING_REAPPROVAL (awaiting manager re-approval)' })
  adjustOrderPrices(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustOrderPricesDto, @Req() req: any) { return this.service.adjustOrderPrices(id, dto, req.user?.id); }

  @Post('orders/:id/confirm-reapproval') @HttpCode(HttpStatus.OK) @RequirePermissions('sales.order.approve') @ApiOperation({ summary: 'Manager re-approves adjusted order — PENDING_REAPPROVAL → CONFIRMED' })
  confirmReapproval(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.confirmReapproval(id, req.user?.id); }

  @Post('orders/:id/start-delivery') @HttpCode(HttpStatus.OK) @AnyPermission('sales.order.approve', 'sales.order.create') @ApiOperation({ summary: 'Start delivery — sets deliveryStatus to IN_TRANSIT' })
  startDelivery(@Param('id', ParseIntPipe) id: number) { return this.service.startDelivery(id); }

  @Post('orders/:id/complete-delivery') @HttpCode(HttpStatus.OK) @AnyPermission('sales.order.approve', 'sales.order.create') @ApiOperation({ summary: 'Complete delivery — sets deliveryStatus to DELIVERED' })
  completeDelivery(@Param('id', ParseIntPipe) id: number) { return this.service.completeDelivery(id); }

  // ─── Customer balance ─────────────────────────────────────────────────────

  @Get('customers/:id/balance') @AnyPermission('customer.view_assigned', 'customers.customer.view') @ApiOperation({ summary: 'Get customer outstanding balance and invoices' })
  getCustomerBalance(@Param('id', ParseIntPipe) id: number) { return this.service.getCustomerBalance(id); }
}
