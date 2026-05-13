import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  customerAddress: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((fn: Function) => fn(mockPrisma)),
};

describe('CustomersService — address methods', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  const mockCustomer = {
    id: 1, customerCode: 'CUST-00001', companyName: 'Test Corp',
    deletedAt: null,
    assignedSales: null, addresses: [], linkedUser: null,
    _count: { quotations: 0, salesOrders: 0, invoices: 0 },
  };

  describe('addAddress', () => {
    it('should create address without isDefault', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const created = { id: 1, customerId: 1, label: 'Kho HCM', address: '123 Nguyễn Huệ', isDefault: false };
      mockPrisma.customerAddress.create.mockResolvedValue(created);

      const result = await service.addAddress(1, { label: 'Kho HCM', address: '123 Nguyễn Huệ' });

      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: { customerId: 1, label: 'Kho HCM', address: '123 Nguyễn Huệ', isDefault: false },
      });
      expect(mockPrisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('should unset other defaults then create when isDefault=true', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const created = { id: 2, customerId: 1, label: 'VP', address: '456 Lê Lợi', isDefault: true };
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.create.mockResolvedValue(created);

      const result = await service.addAddress(1, { label: 'VP', address: '456 Lê Lợi', isDefault: true });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 1, isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: { customerId: 1, label: 'VP', address: '456 Lê Lợi', isDefault: true },
      });
      expect(result).toEqual(created);
    });

    it('should throw 404 when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.addAddress(999, { address: '123 ABC' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAddress', () => {
    it('should throw 404 when address does not belong to customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.updateAddress(1, 99, { address: 'New addr' })).rejects.toThrow(NotFoundException);
    });

    it('should update without isDefault logic when isDefault not set', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const existing = { id: 1, customerId: 1, label: 'Old', address: 'Old addr', isDefault: false };
      mockPrisma.customerAddress.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, label: 'New label' };
      mockPrisma.customerAddress.update.mockResolvedValue(updated);

      const result = await service.updateAddress(1, 1, { label: 'New label' });

      expect(mockPrisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 1 }, data: { label: 'New label' },
      });
      expect(result).toEqual(updated);
    });

    it('should unset other defaults in transaction when isDefault=true', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const existing = { id: 2, customerId: 1, label: 'VP', address: '456', isDefault: false };
      mockPrisma.customerAddress.findFirst.mockResolvedValue(existing);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      const updated = { ...existing, isDefault: true };
      mockPrisma.customerAddress.update.mockResolvedValue(updated);

      await service.updateAddress(1, 2, { isDefault: true });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 1, isDefault: true, id: { not: 2 } },
        data: { isDefault: false },
      });
    });
  });

  describe('removeAddress', () => {
    it('should delete address when ownership confirmed', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const existing = { id: 3, customerId: 1, label: 'Kho', address: '789 XYZ', isDefault: false };
      mockPrisma.customerAddress.findFirst.mockResolvedValue(existing);
      mockPrisma.customerAddress.delete.mockResolvedValue(existing);

      await service.removeAddress(1, 3);

      expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('should throw 404 when address does not belong to customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.removeAddress(1, 99)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.customerAddress.delete).not.toHaveBeenCalled();
    });
  });
});
