import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

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
    const { page = 1, limit = 20, search, categoryId, brandId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;
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

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true, sku: true, productName: true, unit: true,
          standardPrice: true, isActive: true, createdAt: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { inventoryStocks: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
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
        inventoryStocks: {
          include: { warehouse: { select: { id: true, warehouseName: true } } },
        },
      },
    });
    if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const exists = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException(`SKU '${dto.sku}' already exists`);

    const { imageUrls, ...data } = dto;
    return this.prisma.product.create({
      data: {
        ...data,
        standardPrice: data.standardPrice ? data.standardPrice : undefined,
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

  private async ensureCategoryExists(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Category #${id} not found`);
  }
}
