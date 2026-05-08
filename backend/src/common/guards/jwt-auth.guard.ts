import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/types/jwt-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing access token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const session = await this.getSession(payload.sid);
    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session is invalid or revoked');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Session user mismatch');
    }

    const perms = await this.getPermissions(payload.sub);
    const linkedCustomerId = await this.getLinkedCustomerId(payload.sub);

    const authUser: AuthUser = {
      id: payload.sub,
      email: payload.email,
      organizationId: session.organizationId ?? null,
      sessionDbId: session.sessionDbId,
      sessionIdentifier: payload.sid,
      roles: perms.roles,
      permissions: perms.permissions,
      linkedCustomerId,
    };

    request.user = authUser;
    return true;
  }

  private extractToken(request: any): string | null {
    const auth: string = request.headers?.authorization ?? '';
    if (!auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }

  private async getSession(sid: string): Promise<{
    status: string;
    userId: number;
    sessionDbId: number;
    organizationId: number | null;
  } | null> {
    const key = `session:${sid}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const session = await this.prisma.session.findUnique({
      where: { sessionIdentifier: sid },
      select: {
        id: true,
        status: true,
        userId: true,
        user: { select: { organizationId: true } },
      },
    });
    if (!session) return null;

    const data = {
      status: session.status,
      userId: session.userId,
      sessionDbId: session.id,
      organizationId: session.user.organizationId,
    };
    await this.redis.setex(key, 300, JSON.stringify(data));
    return data;
  }

  private async getPermissions(
    userId: number,
  ): Promise<{ roles: string[]; permissions: string[] }> {
    const key = `user:perms:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);
    const permSet = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permSet.add(rp.permission.code);
      }
    }

    const data = { roles, permissions: Array.from(permSet) };
    await this.redis.setex(key, 300, JSON.stringify(data));
    return data;
  }

  private async getLinkedCustomerId(userId: number): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { linkedCustomerId: true },
    });
    return user?.linkedCustomerId ?? null;
  }
}
