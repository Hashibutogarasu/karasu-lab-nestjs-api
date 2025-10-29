import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppErrorCodes } from '../types/error-codes';
import { BaseService } from '../impl/base-service';
import { AppConfigService } from '../app-config/app-config.service';

export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

@Injectable()
export class EncryptionService extends BaseService implements OnModuleInit {
  private publicKey!: string;
  private privateKey!: string;

  private rawPublicKey?: string;
  private rawPrivateKey?: string;

  constructor(appConfigService: AppConfigService, keys?: Partial<KeyPair>) {
    super(appConfigService);
    this.rawPublicKey = keys?.publicKey!;
    this.rawPrivateKey = keys?.privateKey!;
  }

  encrypt(plain: string | null): string {
    if (plain === null || plain === undefined) {
      throw AppErrorCodes.MISSING_PLAIN_TEXT;
    }

    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const aad = Buffer.from('karasu-lab-encryption', 'utf8');
    cipher.setAAD(aad);

    let encrypted = cipher.update(plain, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const pubKeyObj = crypto.createPublicKey(this.publicKey);
    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: pubKeyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey,
    );

    const keyLengthBuffer = Buffer.allocUnsafe(2);
    keyLengthBuffer.writeUInt16BE(encryptedAesKey.length, 0);

    const result = Buffer.concat([
      keyLengthBuffer,
      encryptedAesKey,
      iv,
      authTag,
      encrypted,
    ]);

    try {
      const res = result.toString('base64');

      if (!res) {
        throw AppErrorCodes.MISSING_ENCRYPTED_TEXT;
      }

      return res;
    } catch (err) {
      throw AppErrorCodes.ENCRYPTION_FAILED.setCustomMessage(
        String((err as Error).message || err),
      );
    }
  }

  decrypt(cipherBase64: string | null): string {
    if (cipherBase64 === null || cipherBase64 === undefined) {
      throw AppErrorCodes.MISSING_CIPHER_TEXT;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(cipherBase64, 'base64');
    } catch (err) {
      throw AppErrorCodes.INVALID_BASE64_INPUT;
    }

    try {
      if (buffer.length < 2 + 16 + 16) {
        throw AppErrorCodes.INVALID_BASE64_INPUT;
      }

      const keyLength = buffer.readUInt16BE(0);

      if (buffer.length < 2 + keyLength + 16 + 16) {
        throw AppErrorCodes.INVALID_BASE64_INPUT;
      }

      const encryptedAesKey = buffer.subarray(2, 2 + keyLength);
      const iv = buffer.subarray(2 + keyLength, 2 + keyLength + 16);
      const authTag = buffer.subarray(2 + keyLength + 16, 2 + keyLength + 32);
      const encryptedData = buffer.subarray(2 + keyLength + 32);
      const privKeyObj = crypto.createPrivateKey(this.privateKey);
      const aesKey = crypto.privateDecrypt(
        {
          key: privKeyObj,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedAesKey,
      );

      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      const aad = Buffer.from('karasu-lab-encryption', 'utf8');
      decipher.setAAD(aad);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err) {

      throw AppErrorCodes.DECRYPTION_FAILED.setCustomMessage(
        String((err as Error).message || err),
      );
    }
  }

  onModuleInit(): void {
    this.logger.log('Initializing EncryptionService with RSA keys');
    try {
      if (!this.rawPublicKey || !this.rawPrivateKey) {
        throw AppErrorCodes.MISSING_RSA;
      }
      try {
        this.publicKey = Buffer.from(this.rawPublicKey, 'base64').toString('utf8');
        this.privateKey = Buffer.from(this.rawPrivateKey, 'base64').toString('utf8');
      } catch (e) {
        throw AppErrorCodes.INVALID_RSA_KEY.setCustomMessage(
          'Failed to decode base64-encoded RSA keys',
        );
      }

      crypto.createPublicKey(this.publicKey);
      crypto.createPrivateKey(this.privateKey);

      this.logger.log('Successfully initialized EncryptionService with RSA keys');
    } catch (err) {
      if (err === AppErrorCodes.MISSING_RSA) {
        throw err;
      }

      const message = String((err as Error).message || err);
      throw AppErrorCodes.INVALID_RSA_KEY.setCustomMessage(
        `Invalid RSA key configuration: ${message}`,
      );
    }
  }

  getPrivateKeyPem(): string {
    return this.privateKey;
  }

  getPublicKeyPem(): string {
    return this.publicKey;
  }
}
