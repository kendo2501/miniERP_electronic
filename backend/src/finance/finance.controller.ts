import { Controller, Get, Post, Param, ParseIntPipe, Query, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import {
  CreateInvoiceDto, InvoiceQueryDto,
  CreatePaymentDto, PaymentQueryDto,
  AllocatePaymentDto, ArLedgerQueryDto, OutstandingQueryDto,
} from './dto/finance.dto';
import { RequirePermissions, AnyPermission } from '../common/decorators/permissions.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private service: FinanceService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('invoices') @AnyPermission('finance.invoice.view', 'finance.invoice.view_assigned', 'finance.invoice.view_own') @ApiOperation({ summary: 'List invoices' })
  listInvoices(@Query() query: InvoiceQueryDto, @Req() req: any) { return this.service.listInvoices(query, req.user); }

  @Get('invoices/:id') @AnyPermission('finance.invoice.view', 'finance.invoice.view_assigned', 'finance.invoice.view_own') @ApiOperation({ summary: 'Get invoice' })
  getInvoice(@Param('id', ParseIntPipe) id: number, @Req() req: any) { return this.service.getInvoice(id, req.user); }

  @Post('invoices') @RequirePermissions('finance.invoice.create') @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Body() dto: CreateInvoiceDto) { return this.service.createInvoice(dto); }

  @Post('invoices/:id/send') @HttpCode(HttpStatus.OK) @RequirePermissions('finance.invoice.create') @ApiOperation({ summary: 'Send invoice' })
  sendInvoice(@Param('id', ParseIntPipe) id: number) { return this.service.sendInvoice(id); }

  @Post('invoices/:id/cancel') @HttpCode(HttpStatus.OK) @RequirePermissions('finance.invoice.create') @ApiOperation({ summary: 'Cancel invoice' })
  cancelInvoice(@Param('id', ParseIntPipe) id: number) { return this.service.cancelInvoice(id); }

  // ─── Payments ─────────────────────────────────────────────────────────────

  @Get('payments') @RequirePermissions('finance.payment.view') @ApiOperation({ summary: 'List payments' })
  listPayments(@Query() query: PaymentQueryDto) { return this.service.listPayments(query); }

  @Get('payments/:id') @RequirePermissions('finance.payment.view') @ApiOperation({ summary: 'Get payment' })
  getPayment(@Param('id', ParseIntPipe) id: number) { return this.service.getPayment(id); }

  @Post('payments') @RequirePermissions('finance.payment.create') @ApiOperation({ summary: 'Record payment' })
  createPayment(@Body() dto: CreatePaymentDto) { return this.service.createPayment(dto); }

  @Post('payments/:id/allocate') @HttpCode(HttpStatus.OK) @RequirePermissions('finance.payment.reverse') @ApiOperation({ summary: 'Allocate payment to invoice(s)' })
  allocatePayment(@Param('id', ParseIntPipe) id: number, @Body() dto: AllocatePaymentDto) {
    return this.service.allocatePayment(id, dto);
  }

  // ─── AR Ledger ────────────────────────────────────────────────────────────

  @Get('ar-ledger') @RequirePermissions('finance.invoice.view') @ApiOperation({ summary: 'AR ledger entries (immutable)' })
  listArLedger(@Query() query: ArLedgerQueryDto) { return this.service.listArLedger(query); }

  // ─── Credit Limits ────────────────────────────────────────────────────────

  @Get('credit-limits') @AnyPermission('finance.credit_limit.view', 'finance.invoice.view') @ApiOperation({ summary: 'Customer credit limits with current debt exposure' })
  getCreditLimits() { return this.service.getCreditLimits(); }

  // ─── Order Summary ────────────────────────────────────────────────────────

  @Get('order-summary') @AnyPermission('finance.invoice.view', 'reporting.dashboard.view_finance', 'sales.order.approve', 'sales.order.create') @ApiOperation({ summary: 'Finance dashboard summary based on SalesOrder payment status' })
  getOrderSummary() { return this.service.getOrderSummary(); }

  // ─── Outstanding / Aging ──────────────────────────────────────────────────

  @Get('outstanding') @RequirePermissions('finance.invoice.view') @ApiOperation({ summary: 'Outstanding invoices' })
  getOutstanding(@Query() query: OutstandingQueryDto) { return this.service.getOutstandingBalances(query); }

  @Get('aging') @RequirePermissions('finance.aging_report.view') @ApiOperation({ summary: 'Aging report (0-30-60-90+ days)' })
  getAging() { return this.service.getAgingReport(); }
}
