import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async listLogs(query: AuditLogQueryDto) {
    const {
      page = 1, limit = 30,
      actorId, eventType, category, entityType, entityId, status, dateFrom, dateTo,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (eventType) where.eventType = { contains: eventType, mode: 'insensitive' };
    if (category) where.category = category;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLog(id: number) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async getStats() {
    const [total, byCategory, byStatus, recent] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.prisma.auditLog.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, recent24h: recent, byCategory, byStatus };
  }
}
