import { Module } from '@nestjs/common';
import { StockInquiryController } from './stock-inquiry.controller';
import { StockInquiryService } from './stock-inquiry.service';

@Module({
  controllers: [StockInquiryController],
  providers: [StockInquiryService],
})
export class StockInquiryModule {}
