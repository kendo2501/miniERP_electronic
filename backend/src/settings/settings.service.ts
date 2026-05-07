import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsQueryDto, UpdateSettingDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async listSettings(query: SettingsQueryDto) {
    const where: any = {};
    if (query.category) where.category = query.category;
    if (query.scope) where.scope = query.scope;

    const settings = await this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      select: {
        id: true, category: true, key: true, value: true,
        valueType: true, scope: true, isSensitive: true, isReadonly: true,
        version: true, updatedAt: true,
        updater: { select: { id: true, fullName: true } },
      },
    });

    // Mask sensitive values
    return settings.map((s) => ({
      ...s,
      value: s.isSensitive ? '***' : s.value,
    }));
  }

  async getSetting(key: string) {
    const s = await this.prisma.setting.findFirst({ where: { key } });
    if (!s) throw new NotFoundException(`Setting '${key}' not found`);
    return { ...s, value: s.isSensitive ? '***' : s.value };
  }

  async updateSetting(key: string, dto: UpdateSettingDto, userId: number) {
    const s = await this.prisma.setting.findFirst({ where: { key } });
    if (!s) throw new NotFoundException(`Setting '${key}' not found`);
    if (s.isReadonly) throw new BadRequestException(`Setting '${key}' is read-only`);

    return this.prisma.setting.update({
      where: { id: s.id },
      data: { value: dto.value, updatedBy: userId, version: { increment: 1 } },
      select: { id: true, key: true, value: true, category: true, version: true, updatedAt: true },
    });
  }

  async getCategories() {
    const result = await this.prisma.setting.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    });
    return result.filter((r) => r.category);
  }
}
