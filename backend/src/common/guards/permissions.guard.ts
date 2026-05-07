import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class PermissionsGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const any = this.reflector.getAllAndOverride<string[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length && !any?.length) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user) return false;

    if (required?.length) {
      const hasAll = required.every((perm) => user.permissions.includes(perm));
      if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    }

    if (any?.length) {
      const hasAny = any.some((perm) => user.permissions.includes(perm));
      if (!hasAny) throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
