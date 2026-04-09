import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import { UserRepository } from "../../ports/repositories/user.repository";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwt: JwtService
  ) { }

  async login(dto: { username: string; password: string }) {
    const user = await this.userRepo.findByUsername(dto.username);

    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const permissions = Array.from(new Set(
      user.user_roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.code)
      )
    ));

    const payload = {
      sub: user.id,
      username: user.username,
      permissions
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
      expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as any
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
        expiresIn: (process.env.JWT_REFRESH_TTL ?? "30d") as any
      }
    );

    await this.userRepo.saveRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + 30 * 24 * 3600 * 1000)
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        permissions
      }
    };
  }
}