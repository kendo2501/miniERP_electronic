import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";
import { UserRepository } from "../../ports/repositories/user.repository";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        user_roles: {
          include: {
            roles: {
              include: {
                role_permissions: {
                  include: { permissions: true }
                }
              }
            }
          }
        }
      }
    });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await argon2.hash(token),
        expiresAt
      }
    });
  }
}