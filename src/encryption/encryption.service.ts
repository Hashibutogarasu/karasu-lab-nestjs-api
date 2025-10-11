import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

@Injectable()
export class EncryptionService {
  private publicKey: string;
  private privateKey: string;

  // Accept keys via constructor for easier testing; fall back to env if not provided
  constructor(keys?: Partial<KeyPair>) {
    this.publicKey = keys?.publicKey ?? process.env.ENCRYPTION_PUBLIC_KEY ?? '';
    this.privateKey =
      keys?.privateKey ?? process.env.ENCRYPTION_PRIVATE_KEY ?? '';

    // Validate keys are present and are valid PEMs by attempting to import
    try {
      if (!this.publicKey || !this.privateKey) {
        throw new Error('Missing RSA keys');
      }

      // Quick validation: create KeyObject
      crypto.createPublicKey(this.publicKey);
      crypto.createPrivateKey(this.privateKey);
    } catch (err) {
      // Throw a clearer error for invalid configuration
      throw new Error(
        `Invalid RSA key configuration: ${String((err as Error).message)}`,
      );
    }
  }

  // Encrypt a utf8 string and return base64 encoded ciphertext
  encrypt(plain: string | null): string {
    if (plain === null || plain === undefined) {
      throw new BadRequestException('plain text must be provided');
    }

    const pubKeyObj = crypto.createPublicKey(this.publicKey);

    const encrypted = crypto.publicEncrypt(
      {
        key: pubKeyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(plain, 'utf8'),
    );

    return encrypted.toString('base64');
  }

  // Decrypt a base64 encoded ciphertext and return utf8 string
  decrypt(cipherBase64: string | null): string {
    if (cipherBase64 === null || cipherBase64 === undefined) {
      throw new BadRequestException('cipher text must be provided');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(cipherBase64, 'base64');
    } catch (err) {
      throw new BadRequestException('invalid base64 input');
    }

    try {
      const privKeyObj = crypto.createPrivateKey(this.privateKey);
      const decrypted = crypto.privateDecrypt(
        {
          key: privKeyObj,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      );

      return decrypted.toString('utf8');
    } catch (err) {
      // Expose a generic error for decryption failures
      throw new BadRequestException('decryption failed');
    }
  }
}
