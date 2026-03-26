// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Bật Global Validation chặn dữ liệu rác ngay tại Controller [cite: 32, 149, 153]
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu user gửi data thừa
      transform: true, // Tự động ép kiểu dữ liệu (VD: string '1' -> number 1)
    }),
  );

  // Cấu hình Swagger (API Contract) [cite: 119, 120]
  const config = new DocumentBuilder()
    .setTitle('Mini-ERP B2B API')
    .setDescription('Tài liệu API cho Hệ thống phân phối Thiết bị điện B2B')
    .setVersion('1.0')
    .addBearerAuth() // Chuẩn bị cho JWT Auth ở Tuần 9
    .addTag('Catalog', 'Quản lý danh mục thiết bị')
    .addTag('Inventory', 'Quản lý tồn kho & sổ cái')
    .addTag('Sales', 'Quản lý đơn hàng & Báo giá')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Kích hoạt CORS cho Frontend Next.js gọi vào
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Mini-ERP Backend is running on: http://localhost:${port}`);
  logger.log(`📑 Swagger Docs is available at: http://localhost:${port}/api/docs`);
}
bootstrap();