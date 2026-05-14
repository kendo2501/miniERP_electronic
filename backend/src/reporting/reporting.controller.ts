import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private service: ReportingService) {}

  @Get('dashboard') @RequirePermissions('reporting.dashboard.view_all') @ApiOperation({ summary: 'Dashboard KPIs' })
  getDashboard() { return this.service.getDashboardKpis(); }

  @Get('sales-chart') @RequirePermissions('reporting.kpi.view') @ApiOperation({ summary: 'Sales chart data' })
  @ApiQuery({ name: 'days', required: false })
  getSalesChart(@Query('days') days?: string) {
    return this.service.getSalesChart(days ? parseInt(days) : 30);
  }

  @Get('top-customers') @RequirePermissions('reporting.kpi.view') @ApiOperation({ summary: 'Top customers by revenue' })
  @ApiQuery({ name: 'limit', required: false })
  getTopCustomers(@Query('limit') limit?: string) {
    return this.service.getTopCustomers(limit ? parseInt(limit) : 10);
  }

  @Get('manager-dashboard') @RequirePermissions('reporting.dashboard.view_all') @ApiOperation({ summary: 'Manager dashboard KPIs' })
  getManagerDashboard() { return this.service.getManagerDashboard(); }

  @Get('sales-dashboard') @RequirePermissions('reporting.dashboard.view_self') @ApiOperation({ summary: 'Sales rep self-dashboard' })
  getSalesDashboard(@Request() req: any) { return this.service.getSalesDashboard(req.user.id); }

  @Get('accountant-dashboard') @RequirePermissions('reporting.dashboard.view_finance') @ApiOperation({ summary: 'Accountant finance dashboard' })
  getAccountantDashboard() { return this.service.getAccountantDashboard(); }

  @Get('warehouse-dashboard') @RequirePermissions('reporting.dashboard.view_warehouse') @ApiOperation({ summary: 'Warehouse operations dashboard' })
  getWarehouseDashboard() { return this.service.getWarehouseDashboard(); }
}
