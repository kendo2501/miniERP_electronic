import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

const BUCKET = 'product-images';

const PUBLIC_READ_POLICY = JSON.stringify({
  Version: '2012-10-17',
  Statement: [{
    Effect: 'Allow',
    Principal: { AWS: ['*'] },
    Action: ['s3:GetObject'],
    Resource: [`arn:aws:s3:::${BUCKET}/*`],
  }],
});

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    this.client = new Client({
      endPoint: config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(config.get<string>('MINIO_PORT', '9000'), 10) || 9000,
      useSSL: config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.get<string>('MINIO_ROOT_USER', 'minioadmin'),
      secretKey: config.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin'),
    });
    this.publicUrl = config.get<string>('MINIO_PUBLIC_URL', 'http://localhost:9000');
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(BUCKET);
      if (!exists) {
        await this.client.makeBucket(BUCKET, 'us-east-1');
        await this.client.setBucketPolicy(BUCKET, PUBLIC_READ_POLICY);
        this.logger.log(`Bucket "${BUCKET}" created with public-read policy`);
      }
    } catch (err: any) {
      this.logger.warn(`MinIO init warning: ${err.message}`);
    }
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return `${this.publicUrl}/${BUCKET}/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(BUCKET, key);
  }

  extractKey(imageUrl: string): string {
    const url = new URL(imageUrl);
    return url.pathname.replace(`/${BUCKET}/`, '');
  }
}
