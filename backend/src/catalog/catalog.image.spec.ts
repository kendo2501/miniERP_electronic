import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

const mockPrisma: any = {
  productImage: {
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
  category: { findUnique: jest.fn() },
  brand: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: Function) => fn(mockPrisma)),
};

const mockMinio = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  extractKey: jest.fn(),
};

describe('CatalogService — image methods', () => {
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

  describe('uploadImages', () => {
    const mockProduct = { id: 1, deletedAt: null, sku: 'P-001', productName: 'Test' } as any;

    it('should upload files and create DB records', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productImage.count.mockResolvedValue(0);
      mockMinio.uploadFile.mockResolvedValue('http://localhost:9000/product-images/products/1/uuid.jpg');
      mockPrisma.productImage.create.mockResolvedValue({ id: 1, productId: 1, imageUrl: 'http://localhost:9000/product-images/products/1/uuid.jpg', sortOrder: 0 });

      const file = { mimetype: 'image/jpeg', buffer: Buffer.from('data') } as Express.Multer.File;
      const result = await service.uploadImages(1, [file]);

      expect(mockMinio.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockPrisma.productImage.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should throw 404 when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const file = { mimetype: 'image/png', buffer: Buffer.from('data') } as Express.Multer.File;
      await expect(service.uploadImages(999, [file])).rejects.toThrow(NotFoundException);
    });

    it('should use png extension for image/png mimetype', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productImage.count.mockResolvedValue(2);
      mockMinio.uploadFile.mockResolvedValue('http://localhost:9000/product-images/products/1/uuid.png');
      mockPrisma.productImage.create.mockResolvedValue({ id: 2, productId: 1, imageUrl: 'http://localhost:9000/product-images/products/1/uuid.png', sortOrder: 2 });

      const file = { mimetype: 'image/png', buffer: Buffer.from('data') } as Express.Multer.File;
      await service.uploadImages(1, [file]);

      const uploadCall = mockMinio.uploadFile.mock.calls[0];
      expect(uploadCall[0]).toMatch(/\.png$/);
      expect(uploadCall[0]).toMatch(/^products\/1\//);
    });
  });

  describe('deleteImage', () => {
    it('should delete from MinIO then DB', async () => {
      const image = { id: 5, productId: 1, imageUrl: 'http://localhost:9000/product-images/products/1/abc.jpg' };
      mockPrisma.productImage.findUnique.mockResolvedValue(image);
      mockMinio.extractKey.mockReturnValue('products/1/abc.jpg');
      mockMinio.deleteFile.mockResolvedValue(undefined);
      mockPrisma.productImage.delete.mockResolvedValue(image);

      await service.deleteImage(1, 5);

      expect(mockMinio.extractKey).toHaveBeenCalledWith(image.imageUrl);
      expect(mockMinio.deleteFile).toHaveBeenCalledWith('products/1/abc.jpg');
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('should throw 404 when image not found', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(null);
      await expect(service.deleteImage(1, 99)).rejects.toThrow(NotFoundException);
    });

    it('should throw 404 when image belongs to different product', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue({ id: 5, productId: 2, imageUrl: 'http://x.com/img.jpg' });
      await expect(service.deleteImage(1, 5)).rejects.toThrow(NotFoundException);
    });

    it('should still delete DB record if MinIO object is NoSuchKey', async () => {
      const image = { id: 5, productId: 1, imageUrl: 'http://localhost:9000/product-images/products/1/abc.jpg' };
      mockPrisma.productImage.findUnique.mockResolvedValue(image);
      mockMinio.extractKey.mockReturnValue('products/1/abc.jpg');
      const noSuchKeyErr = Object.assign(new Error('NoSuchKey'), { code: 'NoSuchKey' });
      mockMinio.deleteFile.mockRejectedValue(noSuchKeyErr);
      mockPrisma.productImage.delete.mockResolvedValue(image);

      await service.deleteImage(1, 5);

      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('should rethrow real MinIO errors (not NoSuchKey)', async () => {
      const image = { id: 5, productId: 1, imageUrl: 'http://localhost:9000/product-images/products/1/abc.jpg' };
      mockPrisma.productImage.findUnique.mockResolvedValue(image);
      mockMinio.extractKey.mockReturnValue('products/1/abc.jpg');
      const networkErr = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' });
      mockMinio.deleteFile.mockRejectedValue(networkErr);

      await expect(service.deleteImage(1, 5)).rejects.toThrow('Connection refused');
      expect(mockPrisma.productImage.delete).not.toHaveBeenCalled();
    });
  });
});
