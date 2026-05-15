import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role),
        userRoles: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        organizationId: true,
        linkedCustomerId: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      organizationId: user.organizationId,
      linkedCustomerId: user.linkedCustomerId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      roles: user.userRoles.map((ur) => ur.role.code),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.code),
          ),
        ),
      ],
    };
  }

  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    return { items: roles };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName ?? '',
        status: 'ACTIVE',
        ...(dto.roleIds?.length
          ? { userRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) } }
          : {}),
      },
      select: { id: true, email: true, fullName: true, status: true, createdAt: true },
    });
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { ...dto },
      select: { id: true, email: true, fullName: true, status: true, updatedAt: true },
    });
  }

  async lock(id: number) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED', lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      select: { id: true, status: true },
    });
  }

  async unlock(id: number) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', lockedUntil: null, failedLoginAttempts: 0 },
      select: { id: true, status: true },
    });
  }

  async assignRoles(id: number, roleIds: number[]) {
    await this.ensureExists(id);

    const validRoles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    if (validRoles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    await this.redis.del(`user:perms:${id}`);
    return this.findOne(id);
  }

  private async ensureExists(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
  }
}
