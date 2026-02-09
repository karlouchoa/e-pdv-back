import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        switch (key) {
          case 'R2_ACCOUNT_ID':
            return 'test-account';
          case 'R2_ACCESS_KEY_ID':
            return 'test-access-key';
          case 'R2_SECRET_ACCESS_KEY':
            return 'test-secret-key';
          case 'R2_BUCKET_NAME':
            return 'test-bucket';
          case 'R2_PUBLIC_DOMAIN':
            return 'https://cdn.example.com';
          default:
            throw new Error(`Missing config key: ${key}`);
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
