import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadService } from './upload.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('UploadService', () => {
  let service: UploadService;

  const configValues: Record<string, string> = {
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET_NAME: 'goldpdv-assets',
    R2_PUBLIC_DOMAIN: 'https://cdn.goldpdv.com.br',
    R2_BUCKET_NAME_EPDV: 'e-pdv-assets',
    R2_PUBLIC_DOMAIN_EPDV: 'https://cdn.e-pdv.com',
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];
      if (value === undefined) {
        throw new Error(`Missing config key: ${key}`);
      }
      return value;
    }),
    get: jest.fn((key: string) => configValues[key]),
  };

  const getSignedUrlMock = getSignedUrl as jest.MockedFunction<
    typeof getSignedUrl
  >;

  beforeEach(async () => {
    getSignedUrlMock.mockResolvedValue('https://signed-upload-url.example.com');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    configValues.R2_BUCKET_NAME_EPDV = 'e-pdv-assets';
    configValues.R2_PUBLIC_DOMAIN_EPDV = 'https://cdn.e-pdv.com';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('uses default bucket/domain for non e-pdv origin', async () => {
    const result = await service.generatePresignedUrl(
      'tenantA',
      'produto.jpg',
      'image/jpeg',
      'https://tenanta.goldpdv.com.br/admin',
    );

    const command = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand;

    expect(command.input.Bucket).toBe('goldpdv-assets');
    expect(result.uploadUrl).toBe('https://signed-upload-url.example.com');
    expect(result.fileUrl).toContain(
      'https://cdn.goldpdv.com.br/uploads/tenanta/',
    );
    expect(result.fileKey).toMatch(
      /^uploads\/tenanta\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/,
    );
  });

  it('uses e-pdv bucket/domain when origin is e-pdv', async () => {
    const result = await service.generatePresignedUrl(
      'barataododia',
      'produto.webp',
      'image/webp',
      'https://barataododia.e-pdv.com/admin/itens',
    );

    const command = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand;

    expect(command.input.Bucket).toBe('e-pdv-assets');
    expect(result.fileUrl).toContain(
      'https://cdn.e-pdv.com/uploads/barataododia/',
    );
    expect(result.fileKey).toMatch(
      /^uploads\/barataododia\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/,
    );
  });

  it('uses e-pdv bucket/domain when host indicates e-pdv and origin is absent', async () => {
    const result = await service.generatePresignedUrl(
      'barataododia',
      'produto.png',
      'image/png',
      undefined,
      'barataododia.e-pdv.com',
    );

    const command = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand;

    expect(command.input.Bucket).toBe('e-pdv-assets');
    expect(result.fileUrl).toContain(
      'https://cdn.e-pdv.com/uploads/barataododia/',
    );
    expect(result.fileKey).toMatch(
      /^uploads\/barataododia\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/,
    );
  });

  it('falls back to hardcoded e-pdv target when e-pdv config is incomplete', async () => {
    delete configValues.R2_PUBLIC_DOMAIN_EPDV;

    const result = await service.generatePresignedUrl(
      'barataododia',
      'produto.png',
      'image/png',
      'https://barataododia.e-pdv.com/admin/itens',
    );

    const command = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand;

    expect(command.input.Bucket).toBe('e-pdv-assets');
    expect(result.fileUrl).toContain(
      'https://cdn.e-pdv.com/uploads/barataododia/',
    );
    expect(result.fileKey).toMatch(
      /^uploads\/barataododia\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/,
    );
  });
});
