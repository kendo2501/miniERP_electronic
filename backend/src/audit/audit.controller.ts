import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get('logs') @RequirePermissions('audit.security.view') @ApiOperation({ summary: 'List audit logs' })
  listLogs(@Query() query: AuditLogQueryDto) { return this.service.listLogs(query); }

  @Get('logs/:id') @RequirePermissions('audit.security.view') @ApiOperation({ summary: 'Get audit log detail' })
  getLog(@Param('id', ParseIntPipe) id: number) { return this.service.getLog(id); }

  @Get('stats') @RequirePermissions('audit.security.view') @ApiOperation({ summary: 'Audit log statistics' })
  getStats() { return this.service.getStats(); }
}
