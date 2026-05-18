import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import {
  CreatePurchaseRequestDto, PRQueryDto, RejectPRDto,
  CreateRFQDto, RFQQueryDto, SubmitRFQQuoteDto, SelectRFQWinnerDto,
  CreatePurchaseOrderDto, POQueryDto, CancelPODto,
  CreateGoodsReceiptDto, GRNQueryDto,
  CreatePurchaseInvoiceDto, PurchaseInvoiceQueryDto,
  CreateSupplierPaymentDto, SupplierPaymentQueryDto,
} from './dto/purchase.dto';

@ApiTags('Purchase')
@ApiBearerAuth()
@Controller('purchase')
export class PurchaseController {
  constructor(private service: PurchaseService) {}

  // ─── Purchase Requests ───────────────────────────────────────────────────

  @Get('requests')
  @RequirePermissions('purchase.request.view')
  @ApiOperation({ summary: 'List purchase requests' })
  listPRs(@Query() query: PRQueryDto) { return this.service.listPRs(query); }

  @Get('requests/low-stock-suggestions')
  @RequirePermissions('purchase.request.view')
  @ApiOperation({ summary: 'Get low-stock replenishment suggestions' })
  getLowStockSuggestions() { return this.service.getLowStockSuggestions(); }

  @Get('requests/:id')
  @RequirePermissions('purchase.request.view')
  @ApiOperation({ summary: 'Get purchase request' })
  getPR(@Param('id', ParseIntPipe) id: number) { return this.service.getPR(id); }

  @Post('requests')
  @RequirePermissions('purchase.request.create')
  @ApiOperation({ summary: 'Create purchase request' })
  createPR(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: AuthUser) {
    return this.service.createPR(dto, user.id);
  }

  @Post('requests/:id/submit')
  @RequirePermissions('purchase.request.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit PR for approval' })
  submitPR(@Param('id', ParseIntPipe) id: number) { return this.service.submitPR(id); }

  @Post('requests/:id/approve')
  @RequirePermissions('purchase.request.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve purchase request' })
  approvePR(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.approvePR(id, user.id);
  }

  @Post('requests/:id/reject')
  @RequirePermissions('purchase.request.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject purchase request' })
  rejectPR(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectPRDto) {
    return this.service.rejectPR(id, dto);
  }

  // ─── RFQ ─────────────────────────────────────────────────────────────────

  @Get('rfqs')
  @RequirePermissions('purchase.rfq.view')
  @ApiOperation({ summary: 'List RFQs' })
  listRFQs(@Query() query: RFQQueryDto) { return this.service.listRFQs(query); }

  @Get('rfqs/:id')
  @RequirePermissions('purchase.rfq.view')
  @ApiOperation({ summary: 'Get RFQ detail' })
  getRFQ(@Param('id', ParseIntPipe) id: number) { return this.service.getRFQ(id); }

  @Get('rfqs/:id/comparison')
  @RequirePermissions('purchase.rfq.view')
  @ApiOperation({ summary: 'Get RFQ supplier price comparison' })
  getRFQComparison(@Param('id', ParseIntPipe) id: number) { return this.service.getRFQComparison(id); }

  @Post('rfqs')
  @RequirePermissions('purchase.rfq.manage')
  @ApiOperation({ summary: 'Create RFQ' })
  createRFQ(@Body() dto: CreateRFQDto, @CurrentUser() user: AuthUser) {
    return this.service.createRFQ(dto, user.id);
  }

  @Post('rfqs/:id/quotes')
  @RequirePermissions('purchase.rfq.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit supplier quote for RFQ' })
  submitRFQQuote(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitRFQQuoteDto) {
    return this.service.submitRFQQuote(id, dto);
  }

  @Post('rfqs/:id/select-winner')
  @RequirePermissions('purchase.rfq.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select winning supplier for RFQ' })
  selectRFQWinner(@Param('id', ParseIntPipe) id: number, @Body() dto: SelectRFQWinnerDto) {
    return this.service.selectRFQWinner(id, dto);
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  @Get('orders')
  @RequirePermissions('purchase.order.view')
  @ApiOperation({ summary: 'List purchase orders' })
  listPOs(@Query() query: POQueryDto) { return this.service.listPOs(query); }

  @Get('orders/:id')
  @RequirePermissions('purchase.order.view')
  @ApiOperation({ summary: 'Get purchase order detail' })
  getPO(@Param('id', ParseIntPipe) id: number) { return this.service.getPO(id); }

  @Post('orders')
  @RequirePermissions('purchase.order.manage')
  @ApiOperation({ summary: 'Create purchase order' })
  createPO(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.service.createPO(dto, user.id);
  }

  @Post('orders/:id/send')
  @RequirePermissions('purchase.order.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send purchase order to supplier' })
  sendPO(@Param('id', ParseIntPipe) id: number) { return this.service.sendPO(id); }

  @Post('orders/:id/cancel')
  @RequirePermissions('purchase.order.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel purchase order' })
  cancelPO(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelPODto) {
    return this.service.cancelPO(id, dto);
  }

  // ─── Goods Receipts ──────────────────────────────────────────────────────

  @Get('receipts')
  @RequirePermissions('purchase.grn.view')
  @ApiOperation({ summary: 'List goods receipts (GRNs)' })
  listGRNs(@Query() query: GRNQueryDto) { return this.service.listGRNs(query); }

  @Get('receipts/:id')
  @RequirePermissions('purchase.grn.view')
  @ApiOperation({ summary: 'Get goods receipt detail' })
  getGRN(@Param('id', ParseIntPipe) id: number) { return this.service.getGRN(id); }

  @Post('receipts')
  @RequirePermissions('purchase.grn.manage')
  @ApiOperation({ summary: 'Create goods receipt (GRN)' })
  createGRN(@Body() dto: CreateGoodsReceiptDto, @CurrentUser() user: AuthUser) {
    return this.service.createGRN(dto, user.id);
  }

  @Post('receipts/:id/confirm')
  @RequirePermissions('purchase.grn.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm GRN — triggers inventory update' })
  confirmGRN(@Param('id', ParseIntPipe) id: number) { return this.service.confirmGRN(id); }

  // ─── Purchase Invoices ───────────────────────────────────────────────────

  @Get('invoices')
  @RequirePermissions('purchase.invoice.view')
  @ApiOperation({ summary: 'List purchase invoices' })
  listInvoices(@Query() query: PurchaseInvoiceQueryDto) { return this.service.listInvoices(query); }

  @Get('invoices/:id')
  @RequirePermissions('purchase.invoice.view')
  @ApiOperation({ summary: 'Get purchase invoice detail' })
  getInvoice(@Param('id', ParseIntPipe) id: number) { return this.service.getInvoice(id); }

  @Get('invoices/:id/matching-report')
  @RequirePermissions('purchase.invoice.view')
  @ApiOperation({ summary: '3-way matching report for purchase invoice' })
  getMatchingReport(@Param('id', ParseIntPipe) id: number) { return this.service.getMatchingReport(id); }

  @Post('invoices')
  @RequirePermissions('purchase.invoice.manage')
  @ApiOperation({ summary: 'Create purchase invoice' })
  createInvoice(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.service.createInvoice(dto, user.id);
  }

  @Post('invoices/:id/submit-for-payment')
  @RequirePermissions('purchase.invoice.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit purchase invoice for payment — creates AP ledger entry' })
  submitInvoiceForPayment(@Param('id', ParseIntPipe) id: number) {
    return this.service.submitInvoiceForPayment(id);
  }

  // ─── Supplier Payments ───────────────────────────────────────────────────

  @Get('payments')
  @RequirePermissions('purchase.invoice.view')
  @ApiOperation({ summary: 'List supplier payments' })
  listSupplierPayments(@Query() query: SupplierPaymentQueryDto) { return this.service.listSupplierPayments(query); }

  @Get('payments/:id')
  @RequirePermissions('purchase.invoice.view')
  @ApiOperation({ summary: 'Get supplier payment' })
  getSupplierPayment(@Param('id', ParseIntPipe) id: number) { return this.service.getSupplierPayment(id); }

  @Post('payments')
  @RequirePermissions('purchase.invoice.manage')
  @ApiOperation({ summary: 'Record supplier payment — creates AP ledger CREDIT entry' })
  createSupplierPayment(@Body() dto: CreateSupplierPaymentDto) { return this.service.createSupplierPayment(dto); }

  // ─── Reports ─────────────────────────────────────────────────────────────

  @Get('reports/inbound')
  @RequirePermissions('purchase.report.view')
  @ApiOperation({ summary: 'Inbound goods report by supplier' })
  getInboundReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) { return this.service.getInboundReport(dateFrom, dateTo); }

  @Get('reports/supplier-debt')
  @RequirePermissions('purchase.report.view')
  @ApiOperation({ summary: 'Supplier outstanding debt report' })
  getSupplierDebtReport() { return this.service.getSupplierDebtReport(); }

  @Get('reports/supplier-performance')
  @RequirePermissions('purchase.report.view')
  @ApiOperation({ summary: 'Supplier performance report' })
  getSupplierPerformance(@Query('supplierId', ParseIntPipe) supplierId: number) {
    return this.service.getSupplierPerformance(supplierId);
  }
}
