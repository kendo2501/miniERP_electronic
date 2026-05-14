import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint failed
        const field = (exception.meta as any)?.target ?? 'field';
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `Giá trị đã tồn tại (${field})`,
          error: 'Conflict',
        });
      }
      case 'P2003': {
        // Foreign key constraint failed — referenced record doesn't exist
        const field = (exception.meta as any)?.field_name ?? 'related record';
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Không tìm thấy bản ghi liên quan (${field}). Vui lòng tải lại trang và thử lại.`,
          error: 'Bad Request',
        });
      }
      case 'P2025': {
        // Record not found
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: (exception.meta as any)?.cause ?? 'Không tìm thấy bản ghi',
          error: 'Not Found',
        });
      }
      default: {
        this.logger.error(`Unhandled Prisma error ${exception.code}`, exception.stack);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi cơ sở dữ liệu. Vui lòng thử lại.',
          error: 'Internal Server Error',
        });
      }
    }
  }
}
