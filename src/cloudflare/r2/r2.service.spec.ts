import { Test, TestingModule } from '@nestjs/testing';
import { R2Service } from './r2.service';
import { mock } from 'jest-mock-extended';
import { AppConfigService } from '../../app-config/app-config.service';
import { S3Client } from '@aws-sdk/client-s3';

describe('R2Service', () => {
  let service: R2Service;

  beforeEach(async () => {
    const mockAppConfigService = mock<AppConfigService>({
      get: jest.fn().mockImplementation((key: any) => {
        const values = {
          cloudflareR2BucketName: 'test-bucket',
          cloudflareAccountId: 'test-account-id',
          cloudflareR2AccessKeyId: 'test-access-key-id',
          cloudflareR2SecretAccessKey: 'test-secret',
          cloudflareR2CustomDomain: 'https://cdn.example.com',
        };
        return values[key];
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Service,
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    }).compile();

    service = module.get<R2Service>(R2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('S3 operations', () => {
    let mockClient: { send: jest.Mock };

    beforeEach(() => {
      mockClient = mock<S3Client>();
      (service as any).s3Client = mockClient;
    });

    it('listBuckets should call ListBucketsCommand and return buckets', async () => {
      const expected = { Buckets: [{ Name: 'test-bucket' }] };
      mockClient.send.mockResolvedValueOnce(expected);

      const res = await service.listBuckets();

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd?.constructor?.name).toBe('ListBucketsCommand');
      expect(res).toEqual(expected);
    });

    it('putObject should send PutObjectCommand with correct input', async () => {
      const returned = { ETag: '"etag"' };
      mockClient.send.mockResolvedValueOnce(returned);

      const key = 'path/to/obj.txt';
      const body = 'hello world';

      const res = await service.putObject(key, body);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd?.constructor?.name).toBe('PutObjectCommand');
      expect(cmd.input.Bucket).toBe('test-bucket');
      expect(cmd.input.Key).toBe(key);
      expect(cmd.input.Body).toBe(body);
      expect(res).toEqual(returned);
    });

    it('getObject should send GetObjectCommand and return Body', async () => {
      const fakeBody = Buffer.from('file-bytes');
      const returned = { Body: fakeBody };
      mockClient.send.mockResolvedValueOnce(returned);

      const key = 'path/to/obj.txt';
      const res = await service.getObject(key);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd?.constructor?.name).toBe('GetObjectCommand');
      expect(cmd.input.Bucket).toBe('test-bucket');
      expect(cmd.input.Key).toBe(key);
      expect(res).toEqual(returned);
    });

    it('deleteObject should overwrite object with empty body (PutObjectCommand)', async () => {
      mockClient.send.mockResolvedValueOnce({});

      const key = 'path/to/obj-to-delete.txt';
      await service.deleteObject(key);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd?.constructor?.name).toBe('DeleteObjectCommand');
      expect(cmd.input.Bucket).toBe('test-bucket');
      expect(cmd.input.Key).toBe(key);
    });

    it('getObjectUrl should return correctly formatted URL using custom domain and encoded path', () => {
      return (async () => {
        const key = '/path/to/obj name.txt';

        const signed = 'https://test-account.r2.cloudflarestorage.com/test-bucket/path/to/obj%20name.txt?sig=abc';
        service.getSignedUrl = jest.fn().mockResolvedValueOnce(signed);

        const url = await service.getObjectUrl(key);

        expect(service.getSignedUrl).toHaveBeenCalledTimes(1);
        const passedCommand = (service.getSignedUrl as jest.Mock).mock.calls[0][1];
        expect(passedCommand?.constructor?.name).toBe('Number');

        expect(url).toBe('https://cdn.example.com/test-bucket/path/to/obj%20name.txt?sig=abc');
      })();
    });
  });
});
