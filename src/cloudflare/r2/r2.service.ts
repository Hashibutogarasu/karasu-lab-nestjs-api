import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../app-config/app-config.service';

import {
  S3Client,
  ListBucketsCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly accountId: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly customDomain: string;

  constructor(private readonly appConfigService: AppConfigService) {
    this.bucketName = this.appConfigService.get('cloudflareR2BucketName')!;
    this.accountId = this.appConfigService.get('cloudflareAccountId')!;
    this.accessKeyId = this.appConfigService.get('cloudflareR2AccessKeyId')!;
    this.secretAccessKey = this.appConfigService.get(
      'cloudflareR2SecretAccessKey',
    )!;
    this.customDomain = this.appConfigService.get('cloudflareR2CustomDomain')!;

    this.endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  get s3() {
    return this.s3Client;
  }

  async listBuckets() {
    const command = new ListBucketsCommand({});
    return this.s3Client.send(command);
  }

  async putObject(key: string, body: Buffer | Uint8Array | Blob | string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
    });
    return this.s3.send(command);
  }

  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return this.s3.send(command);
  }

  async deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return this.s3.send(command);
  }

  async getObjectUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const sanitizeKey = (k: string) => k.replace(/^\/+/, '');

    const sanitized = sanitizeKey(key);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: sanitized,
    });

    const signedUrl = await this.getSignedUrl(command, expiresInSeconds);

    if (this.customDomain) {
      try {
        const signed = new URL(signedUrl);
        const cd = this.customDomain.replace(/\/$/, '');
        const pathAndQuery = signed.pathname + signed.search;
        return `${cd}${pathAndQuery}`;
      } catch (e) {
        return signedUrl;
      }
    }

    return signedUrl;
  }

  async getSignedUrl(
    command: GetObjectCommand,
    expiresIn = 3600,
  ): Promise<string> {
    const url = await awsGetSignedUrl(this.s3Client, command, {
      expiresIn: expiresIn,
    });
    return url;
  }
}
