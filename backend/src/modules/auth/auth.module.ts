import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "src/database/prisma.service";
import { AuthController } from "./adapters/controllers/auth.controller";
import { AuthService } from "./application/services/auth.service";
import { UserRepositoryImpl } from "./adapters/repositories/user.repository.impl";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as any
      }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    {
      provide: "UserRepository",
      useClass: UserRepositoryImpl
    }
  ],
  exports: [AuthService]
})
export class AuthModule { }