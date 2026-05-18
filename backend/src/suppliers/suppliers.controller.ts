import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierQueryDto } from './dto/supplier.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private service: SuppliersService) {}

  @Get() @RequirePermissions('supplier.view') @ApiOperation({ summary: 'List suppliers' })
  findAll(@Query() query: SupplierQueryDto) { return this.service.findAll(query); }

  @Get(':id') @RequirePermissions('supplier.view') @ApiOperation({ summary: 'Get supplier' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() @RequirePermissions('supplier.create') @ApiOperation({ summary: 'Create supplier' })
  create(@Body() dto: CreateSupplierDto) { return this.service.create(dto); }

  @Patch(':id') @RequirePermissions('supplier.update') @ApiOperation({ summary: 'Update supplier' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @HttpCode(HttpStatus.OK) @RequirePermissions('supplier.delete') @ApiOperation({ summary: 'Soft-delete supplier' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
