import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

const mockCategory = { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() };
const mockProduct = { findMany: jest.fn(), findUnique: jest.fn() };
const mockPrisma: any = {
  category: mockCategory,
  product: mockProduct,
  brand: { findUnique: jest.fn() },
  productImage: { count: jest.fn(), create: jest.fn() },
  $transaction: jest.fn((fn: Function) => fn(mockPrisma)),
};

const mockMinio = { uploadFile: jest.fn(), deleteFile: jest.fn(), extractKey: jest.fn() };

async function buildXlsxBuffer(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  for (const row of rows) ws.addRow(row);
  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

describe('CatalogService — Excel methods', () => {
  let service: CatalogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();
    service = module.get<CatalogService>(CatalogService);
  });

  // ─── exportCategoryTemplate ─────────────────────────────────────────────────

  describe('exportCategoryTemplate', () => {
    it('should return a Buffer', async () => {
      const buffer = await service.exportCategoryTemplate();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should produce a parseable xlsx with correct header row', async () => {
      const buffer = await service.exportCategoryTemplate();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      const ws = wb.worksheets[0];
      expect(ws.name).toBe('Categories');
      expect(ws.getRow(1).getCell(1).value).toBe('Code');
      expect(ws.getRow(1).getCell(2).value).toBe('Name');
      expect(ws.getRow(1).getCell(3).value).toBe('ParentCode');
      expect(ws.getRow(1).getCell(4).value).toBe('Description');
    });
  });

  // ─── importCategories ───────────────────────────────────────────────────────

  describe('importCategories', () => {
    it('should create new categories and skip blank rows', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.create.mockResolvedValue({ id: 1, code: 'CAT-01' });

      const buf = await buildXlsxBuffer([
        ['Code', 'Name', 'ParentCode', 'Description'],
        ['CAT-01', 'Cáp điện', '', 'Nhóm cáp'],
        ['', '', '', ''],
      ]);

      const result = await service.importCategories(buf);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.category.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing category when code already exists', async () => {
      mockPrisma.category.findMany.mockResolvedValue([{ id: 10, code: 'CAT-01' }]);
      mockPrisma.category.update.mockResolvedValue({ id: 10, code: 'CAT-01' });

      const buf = await buildXlsxBuffer([
        ['Code', 'Name', 'ParentCode', 'Description'],
        ['CAT-01', 'Cáp điện updated', '', 'Mô tả mới'],
      ]);

      const result = await service.importCategories(buf);
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'CAT-01' } }),
      );
    });

    it('should add error for unknown ParentCode and still process valid rows', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.create.mockResolvedValue({ id: 2, code: 'CAT-02' });

      const buf = await buildXlsxBuffer([
        ['Code', 'Name', 'ParentCode', 'Description'],
        ['CAT-BAD', 'Bad child', 'NONEXISTENT', ''],
        ['CAT-02', 'Valid', '', ''],
      ]);

      const result = await service.importCategories(buf);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].message).toContain('NONEXISTENT');
      expect(result.created).toBe(1);
    });

    it('should allow child row to reference a parent created earlier in the same batch', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.create
        .mockResolvedValueOnce({ id: 1, code: 'PARENT' })
        .mockResolvedValueOnce({ id: 2, code: 'CHILD' });

      const buf = await buildXlsxBuffer([
        ['Code', 'Name', 'ParentCode', 'Description'],
        ['PARENT', 'Parent Cat', '', ''],
        ['CHILD', 'Child Cat', 'PARENT', ''],
      ]);

      const result = await service.importCategories(buf);
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ─── exportProducts ─────────────────────────────────────────────────────────

  describe('exportProducts', () => {
    const mockProducts = [
      {
        sku: 'P-001',
        productName: 'Cáp điện 2.5mm',
        unit: 'cuộn',
        minPrice: 150000,
        category: { name: 'Cáp điện' },
        brand: { name: 'Cadivi' },
        attributes: [{ attrKey: 'Tiết diện', attrValue: '2.5mm²' }],
        uomConversions: [{ fromUnit: 'cuộn', toUnit: 'm', conversionRate: 100 }],
      },
    ];

    it('should return a Buffer with correct rows', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const buffer = await service.exportProducts({} as any);
      expect(buffer).toBeInstanceOf(Buffer);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      const ws = wb.worksheets[0];
      expect(ws.name).toBe('Products');
      expect(ws.getRow(1).getCell(1).value).toBe('SKU');
      expect(ws.getRow(2).getCell(1).value).toBe('P-001');
      expect(ws.getRow(2).getCell(3).value).toBe('Cáp điện');
      expect(ws.getRow(2).getCell(7).value).toBe('Tiết diện: 2.5mm²');
      expect(ws.getRow(2).getCell(8).value).toBe('cuộn→m×100');
    });

    it('should pass filters to prisma query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.exportProducts({ search: 'test', categoryId: 5 } as any);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 5 }),
        }),
      );
    });
  });
});
