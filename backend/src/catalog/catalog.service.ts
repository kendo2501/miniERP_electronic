import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductAttributeDto } from './dto/product-attribute.dto';
import { UomConversionDto } from './dto/uom-conversion.dto';

type ImportResult = { created: number; updated: number; errors: { row: number; message: string }[] };

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  // ─── CATEGORIES ────────────────────────────────────────────────────────────

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true, code: true, name: true, description: true,
        parentId: true, isActive: true, createdAt: true,
        _count: { select: { products: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryTree() {
    const all = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true, code: true, name: true, parentId: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    const map = new Map(all.map((c) => ({ ...c, children: [] as typeof all })).map((c) => [c.id, c]));
    const roots: typeof all = [];
    for (const c of map.values()) {
      if (c.parentId) map.get(c.parentId)?.children.push(c as any);
      else roots.push(c as any);
    }
    return roots;
  }

  async createCategory(dto: CreateCategoryDto) {
    if (dto.code) {
      const exists = await this.prisma.category.findUnique({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Category code already exists');
    }
    return this.prisma.category.create({
      data: { name: dto.name, code: dto.code, description: dto.description, parentId: dto.parentId },
    });
  }

  async updateCategory(id: number, dto: Partial<CreateCategoryDto>) {
    await this.ensureCategoryExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deactivateCategory(id: number) {
    await this.ensureCategoryExists(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  // ─── BRANDS ───────────────────────────────────────────────────────────────

  async getBrands() {
    return this.prisma.brand.findMany({
      select: {
        id: true, code: true, name: true, description: true, createdAt: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(dto: CreateBrandDto) {
    if (dto.code) {
      const exists = await this.prisma.brand.findUnique({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Brand code already exists');
    }
    return this.prisma.brand.create({ data: { name: dto.name, code: dto.code, description: dto.description } });
  }

  async updateBrand(id: number, dto: Partial<CreateBrandDto>) {
    const exists = await this.prisma.brand.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Brand #${id} not found`);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────

  async getProducts(query: ProductQueryDto) {
    const { page = 1, limit = 20, search, categoryId, brandId, isActive, sortBy = 'createdAt', sortOrder = 'desc', attrKey, attrValue } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (attrKey && attrValue) {
      where.attributes = { some: { attrKey, attrValue } };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true, sku: true, productName: true, unit: true,
          standardPrice: true, minPrice: true, isActive: true, createdAt: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          inventoryStocks: { select: { availableQuantity: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map(({ inventoryStocks, ...p }) => ({
        ...p,
        totalStock: inventoryStocks.reduce((sum, s) => sum + Number(s.availableQuantity), 0),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        attributes: { orderBy: { attrKey: 'asc' } },
        uomConversions: { orderBy: { fromUnit: 'asc' } },
        inventoryStocks: {
          include: { warehouse: { select: { id: true, warehouseName: true } } },
        },
      },
    });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async upsertProductAttributes(productId: number, attrs: ProductAttributeDto[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${productId} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.productAttribute.deleteMany({ where: { productId } });
      if (attrs.length > 0) {
        await tx.productAttribute.createMany({
          data: attrs.map((a) => ({ productId, attrKey: a.attrKey, attrValue: a.attrValue })),
        });
      }
      return tx.productAttribute.findMany({ where: { productId }, orderBy: { attrKey: 'asc' } });
    });
  }

  async upsertUomConversions(productId: number, conversions: UomConversionDto[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${productId} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.uomConversion.deleteMany({ where: { productId } });
      if (conversions.length > 0) {
        await tx.uomConversion.createMany({
          data: conversions.map((c) => ({
            productId,
            fromUnit: c.fromUnit,
            toUnit: c.toUnit,
            conversionRate: c.conversionRate,
          })),
        });
      }
      return tx.uomConversion.findMany({ where: { productId }, orderBy: { fromUnit: 'asc' } });
    });
  }

  async createProduct(dto: CreateProductDto) {
    const exists = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException(`SKU '${dto.sku}' already exists`);

    const { imageUrls, ...data } = dto;
    return this.prisma.product.create({
      data: {
        ...data,
        standardPrice: data.standardPrice ? data.standardPrice : undefined,
        minPrice: data.minPrice ? data.minPrice : undefined,
        weight: data.weight ? data.weight : undefined,
        ...(imageUrls?.length
          ? { images: { create: imageUrls.map((url, i) => ({ imageUrl: url, sortOrder: i })) } }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: true,
      },
    });
  }

  async updateProduct(id: number, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);

    const { imageUrls, ...data } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        standardPrice: data.standardPrice ? data.standardPrice : undefined,
        minPrice: data.minPrice ? data.minPrice : undefined,
        weight: data.weight ? data.weight : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        images: true,
      },
    });
  }

  async deactivateProduct(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, sku: true, isActive: true },
    });
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async uploadImages(productId: number, files: Express.Multer.File[]) {
    await this.getProduct(productId);

    // Upload to MinIO first (outside transaction)
    const uploads = await Promise.all(
      files.map(async (file) => {
        const ext = file.mimetype === 'image/jpeg' ? 'jpg' : 'png';
        const key = `products/${productId}/${randomUUID()}.${ext}`;
        const url = await this.minioService.uploadFile(key, file.buffer, file.mimetype);
        return url;
      }),
    );

    // Serialize count + creates in a transaction to avoid sortOrder race condition
    return this.prisma.$transaction(async (tx) => {
      const currentCount = await tx.productImage.count({ where: { productId } });
      return Promise.all(
        uploads.map((imageUrl, i) =>
          tx.productImage.create({
            data: { productId, imageUrl, sortOrder: currentCount + i },
          }),
        ),
      );
    });
  }

  async deleteImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(`Image #${imageId} not found for product #${productId}`);
    }
    const key = this.minioService.extractKey(image.imageUrl);
    try {
      await this.minioService.deleteFile(key);
    } catch (err: any) {
      // Only ignore "object not found" — rethrow real errors (network, permission, etc.)
      if (err.code !== 'NoSuchKey') throw err;
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }

  // ─── EXCEL IMPORT / EXPORT ────────────────────────────────────────────────

  async exportCategoryTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Categories');
    ws.columns = [
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'ParentCode', key: 'parentCode', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
    ];
    ws.getRow(1).font = { bold: true };
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async importCategories(buffer: Buffer): Promise<ImportResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];

    const existing = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });
    const codeMap = new Map(
      existing.filter((c) => c.code).map((c) => [c.code!, c.id]),
    );

    const errors: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 2; i <= ws.rowCount; i++) {
      const row = ws.getRow(i);
      const code = (row.getCell(1).text ?? '').trim();
      const name = (row.getCell(2).text ?? '').trim();
      const parentCode = (row.getCell(3).text ?? '').trim();
      const description = (row.getCell(4).text ?? '').trim();

      if (!name) continue;

      let parentId: number | undefined;
      if (parentCode) {
        const found = codeMap.get(parentCode);
        if (!found) {
          errors.push({ row: i, message: `ParentCode "${parentCode}" không tồn tại` });
          continue;
        }
        parentId = found;
      }

      if (code && codeMap.has(code)) {
        await this.prisma.category.update({
          where: { code },
          data: { name, description: description || undefined, parentId: parentId ?? null },
        });
        updated++;
      } else {
        const newCat = await this.prisma.category.create({
          data: {
            code: code || undefined,
            name,
            description: description || undefined,
            parentId,
          },
        });
        if (code) codeMap.set(code, newCat.id);
        created++;
      }
    }

    return { created, updated, errors };
  }

  async exportProducts(query: ProductQueryDto): Promise<Buffer> {
    const { search, categoryId, brandId, isActive, attrKey, attrValue } = query;

    const where: any = { deletedAt: null };
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (attrKey && attrValue) {
      where.attributes = { some: { attrKey, attrValue } };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        attributes: { orderBy: { attrKey: 'asc' } },
        uomConversions: { orderBy: { fromUnit: 'asc' } },
      },
      orderBy: { sku: 'asc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'MinPrice', key: 'minPrice', width: 15 },
      { header: 'Attributes', key: 'attributes', width: 50 },
      { header: 'UoM Conversions', key: 'uom', width: 40 },
    ];
    ws.getRow(1).font = { bold: true };

    for (const p of products) {
      ws.addRow({
        sku: p.sku,
        name: p.productName,
        category: p.category?.name ?? '',
        brand: p.brand?.name ?? '',
        unit: p.unit ?? '',
        minPrice: p.minPrice ? Number(p.minPrice) : '',
        attributes: p.attributes.map((a) => `${a.attrKey}: ${a.attrValue}`).join('; '),
        uom: p.uomConversions.map((u) => `${u.fromUnit}→${u.toUnit}×${Number(u.conversionRate)}`).join('; '),
      });
    }

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private async ensureCategoryExists(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Category #${id} not found`);
  }
}
