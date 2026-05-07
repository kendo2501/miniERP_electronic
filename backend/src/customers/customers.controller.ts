import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customer.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get() @RequirePermissions('customer.view_assigned') @ApiOperation({ summary: 'List customers' })
  findAll(@Query() query: CustomerQueryDto) { return this.service.findAll(query); }

  @Get(':id') @RequirePermissions('customer.view_assigned') @ApiOperation({ summary: 'Get customer detail' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() @RequirePermissions('customer.create') @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto) { return this.service.create(dto); }

  @Patch(':id') @RequirePermissions('customer.update_assigned') @ApiOperation({ summary: 'Update customer' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) { return this.service.update(id, dto); }

  @Delete(':id') @HttpCode(HttpStatus.OK) @RequirePermissions('customer.update_assigned') @ApiOperation({ summary: 'Soft-delete customer' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
