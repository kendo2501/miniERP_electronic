import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private service: CatalogService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermissions('catalog.search')
  @ApiOperation({ summary: 'List all active categories' })
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/tree')
  @RequirePermissions('catalog.search')
  @ApiOperation({ summary: 'Get category hierarchy as tree' })
  getCategoryTree() {
    return this.service.getCategoryTree();
  }

  @Post('categories')
  @RequirePermissions('catalog.category.manage')
  @ApiOperation({ summary: 'Create category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions('catalog.category.manage')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('catalog.category.manage')
  @ApiOperation({ summary: 'Deactivate category' })
  deactivateCategory(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivateCategory(id);
  }

  // ─── Brands ───────────────────────────────────────────────────────────────

  @Get('brands')
  @RequirePermissions('catalog.search')
  @ApiOperation({ summary: 'List all brands' })
  getBrands() {
    return this.service.getBrands();
  }

  @Post('brands')
  @RequirePermissions('catalog.category.manage')
  @ApiOperation({ summary: 'Create brand' })
  createBrand(@Body() dto: CreateBrandDto) {
    return this.service.createBrand(dto);
  }

  @Patch('brands/:id')
  @RequirePermissions('catalog.category.manage')
  @ApiOperation({ summary: 'Update brand' })
  updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateBrandDto>,
  ) {
    return this.service.updateBrand(id, dto);
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  @Get('products')
  @RequirePermissions('catalog.product.view')
  @ApiOperation({ summary: 'List products (paginated)' })
  getProducts(@Query() query: ProductQueryDto) {
    return this.service.getProducts(query);
  }

  @Get('products/:id')
  @RequirePermissions('catalog.product.view')
  @ApiOperation({ summary: 'Get product detail' })
  getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.service.getProduct(id);
  }

  @Post('products')
  @RequirePermissions('catalog.product.create')
  @ApiOperation({ summary: 'Create product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  @RequirePermissions('catalog.product.update')
  @ApiOperation({ summary: 'Update product' })
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.service.updateProduct(id, dto);
  }

  @Post('products/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('catalog.product.deactivate')
  @ApiOperation({ summary: 'Deactivate product' })
  deactivateProduct(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivateProduct(id);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('catalog.product.deactivate')
  @ApiOperation({ summary: 'Soft-delete product' })
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteProduct(id);
  }
}
