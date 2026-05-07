import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto, CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async listMyNotifications(userId: number, query: NotificationQueryDto) {
    const { page = 1, limit = 20, status, channel } = query;
    const skip = (page - 1) * limit;
    const where: any = { recipientId: userId };
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, channel: true, notificationType: true, subject: true,
          content: true, status: true, priority: true,
          sentAt: true, readAt: true, createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, readAt: null, status: { not: 'CANCELLED' } },
    });
    return { unreadCount: count };
  }

  async markAsRead(userId: number, id: number) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException(`Notification #${id} not found`);
    if (n.recipientId !== userId) throw new NotFoundException(`Notification #${id} not found`);
    return this.prisma.notification.update({
      where: { id }, data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // Admin: list all notifications
  async listAll(query: NotificationQueryDto) {
    const { page = 1, limit = 20, status, channel } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { recipient: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        channel: dto.channel,
        notificationType: dto.notificationType,
        subject: dto.subject,
        content: dto.content,
        priority: dto.priority ?? 'NORMAL',
        status: 'PENDING',
      },
    });
  }
}
