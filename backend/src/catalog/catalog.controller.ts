import {
  Controller, Get, Post, Patch, Delete, Put,
  Body, Param, ParseIntPipe, Query,
  HttpCode, HttpStatus, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException,
  StreamableFile, Res,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpsertProductAttributesDto } from './dto/product-attribute.dto';
import { UpsertUomConversionsDto } from './dto/uom-conversion.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: Function) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new BadRequestException(`File "${file.originalname}" is not JPG or PNG`), false);
    }
    cb(null, true);
  },
};

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

  @Get('categories/export-template')
  @RequirePermissions('catalog.search')
  @ApiOperation({ summary: 'Download empty category import template (.xlsx)' })
  async exportCategoryTemplate(@Res({ passthrough: true }) res: Response) {
    const buffer = await this.service.exportCategoryTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="categories-template.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @Post('categories/import')
  @RequirePermissions('catalog.category.manage')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Bulk import categories from Excel' })
  async importCategories(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.service.importCategories(file.buffer);
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

  @Get('products/export')
  @RequirePermissions('catalog.product.view')
  @ApiOperation({ summary: 'Export all products to Excel (with optional filters)' })
  async exportProducts(@Query() query: ProductQueryDto, @Res({ passthrough: true }) res: Response) {
    const buffer = await this.service.exportProducts(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="products-export.xlsx"',
    });
    return new StreamableFile(buffer);
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

  @Put('products/:id/attributes')
  @RequirePermissions('catalog.product.update')
  @ApiOperation({ summary: 'Replace all dynamic attributes for a product' })
  upsertProductAttributes(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertProductAttributesDto,
  ) {
    return this.service.upsertProductAttributes(id, dto.attributes);
  }

  @Put('products/:id/uom-conversions')
  @RequirePermissions('catalog.product.update')
  @ApiOperation({ summary: 'Replace all UoM conversions for a product' })
  upsertUomConversions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertUomConversionsDto,
  ) {
    return this.service.upsertUomConversions(id, dto.conversions);
  }

  @Post('products/:id/images')
  @RequirePermissions('catalog.product.update')
  @UseInterceptors(FilesInterceptor('files', 10, imageUploadOptions))
  @ApiOperation({ summary: 'Upload images for a product' })
  uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) throw new BadRequestException('No files provided');
    return this.service.uploadImages(id, files);
  }

  @Delete('products/:id/images/:imageId')
  @RequirePermissions('catalog.product.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product image' })
  deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.service.deleteImage(id, imageId);
  }
}
