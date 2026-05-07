import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { JwtPayload } from './types/jwt-payload.type';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUser } from '../common/types/auth-user.type';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(`Account locked until ${user.lockedUntil.toISOString()}`);
    }
    if (user.status === 'INACTIVE') {
      throw new ForbiddenException('Account is inactive');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const sessionIdentifier = uuidv4();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionIdentifier,
        ipAddress,
        userAgent,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const sessionData = {
      status: 'ACTIVE',
      userId: user.id,
      sessionDbId: session.id,
      organizationId: user.organizationId,
    };
    await this.redis.setex(`session:${sessionIdentifier}`, 300, JSON.stringify(sessionData));

    const payload: JwtPayload = { sub: user.id, sid: sessionIdentifier, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.createRefreshToken(session.id, user.id);

    return { accessToken, refreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });

    if (!stored || stored.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { status: 'EXPIRED' } });
      throw new UnauthorizedException('Refresh token expired');
    }
    if (stored.session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session is revoked');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { status: 'USED' } });

    const newRefreshToken = await this.createRefreshToken(
      stored.sessionId,
      stored.userId,
      stored.id,
    );

    const payload: JwtPayload = {
      sub: stored.session.userId,
      sid: stored.session.sessionIdentifier,
      email: stored.session.user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, refreshToken: newRefreshToken, expiresIn: this.getExpiresInSeconds() };
  }

  async logout(user: AuthUser): Promise<void> {
    await this.prisma.session.update({
      where: { id: user.sessionDbId },
      data: { status: 'REVOKED' },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId: user.sessionDbId, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
    await this.redis.del(`session:${user.sessionIdentifier}`);
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<void> {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const valid = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

    await this.prisma.session.updateMany({
      where: { userId: user.id, status: 'ACTIVE', id: { not: user.sessionDbId } },
      data: { status: 'REVOKED' },
    });
  }

  private async handleFailedLogin(userId: number, currentAttempts: number): Promise<void> {
    const attempts = currentAttempts + 1;
    const data: any = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
    }
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  private async createRefreshToken(
    sessionId: number,
    userId: number,
    rotatedFromId?: number,
  ): Promise<string> {
    const raw = uuidv4();
    const tokenHash = this.hashToken(raw);
    await this.prisma.refreshToken.create({
      data: {
        sessionId,
        userId,
        tokenHash,
        rotatedFromId,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return raw;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getExpiresInSeconds(): number {
    const val = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const match = val.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const n = parseInt(match[1]);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return n * (multipliers[match[2]] ?? 60);
  }
}
