import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      bucketExists: jest.fn().mockResolvedValue(true),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      setBucketPolicy: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
      removeObject: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => {
              const map: Record<string, string> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: '9000',
                MINIO_USE_SSL: 'false',
                MINIO_ROOT_USER: 'minioadmin',
                MINIO_ROOT_PASSWORD: 'minioadmin',
                MINIO_PUBLIC_URL: 'http://localhost:9000',
              };
              return map[key] ?? def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uploadFile should return public URL', async () => {
    const url = await service.uploadFile('products/1/test.jpg', Buffer.from('data'), 'image/jpeg');
    expect(url).toBe('http://localhost:9000/product-images/products/1/test.jpg');
  });

  it('extractKey should extract object key from imageUrl', () => {
    const key = service.extractKey('http://localhost:9000/product-images/products/42/abc.png');
    expect(key).toBe('products/42/abc.png');
  });

  it('deleteFile should call removeObject', async () => {
    await expect(service.deleteFile('products/1/test.jpg')).resolves.toBeUndefined();
  });
});
