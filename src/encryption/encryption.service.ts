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
    this.publicKey = keys?.publicKey ?? process.env.ENCRYPTION_PUBLIC_KEY!;
    this.privateKey = keys?.privateKey ?? process.env.ENCRYPTION_PRIVATE_KEY!;

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

  // Encrypt a utf8 string using AES-256-GCM with RSA-encrypted key and return base64 encoded result
  encrypt(plain: string | null): string {
    if (plain === null || plain === undefined) {
      throw new BadRequestException('plain text must be provided');
    }

    // Generate random AES key and IV
    const aesKey = crypto.randomBytes(32); // 256-bit key for AES-256
    const iv = crypto.randomBytes(16); // 128-bit IV for GCM mode

    // Encrypt data with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const aad = Buffer.from('karasu-lab-encryption', 'utf8');
    cipher.setAAD(aad); // Additional authenticated data

    let encrypted = cipher.update(plain, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Encrypt the AES key with RSA
    const pubKeyObj = crypto.createPublicKey(this.publicKey);
    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: pubKeyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey,
    );

    // Combine encrypted AES key, IV, auth tag, and encrypted data
    // Format: [keyLength(2 bytes)][encryptedAesKey][iv(16 bytes)][authTag(16 bytes)][encryptedData]
    const keyLengthBuffer = Buffer.allocUnsafe(2);
    keyLengthBuffer.writeUInt16BE(encryptedAesKey.length, 0);

    const result = Buffer.concat([
      keyLengthBuffer,
      encryptedAesKey,
      iv,
      authTag,
      encrypted,
    ]);

    return result.toString('base64');
  } // Decrypt a base64 encoded ciphertext (AES-256-GCM with RSA-encrypted key) and return utf8 string
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
      // Parse the encrypted data format
      // Format: [keyLength(2 bytes)][encryptedAesKey][iv(16 bytes)][authTag(16 bytes)][encryptedData]

      if (buffer.length < 2 + 16 + 16) {
        throw new BadRequestException('invalid encrypted data format');
      }

      const keyLength = buffer.readUInt16BE(0);

      if (buffer.length < 2 + keyLength + 16 + 16) {
        throw new BadRequestException('invalid encrypted data format');
      }

      const encryptedAesKey = buffer.subarray(2, 2 + keyLength);
      const iv = buffer.subarray(2 + keyLength, 2 + keyLength + 16);
      const authTag = buffer.subarray(2 + keyLength + 16, 2 + keyLength + 32);
      const encryptedData = buffer.subarray(2 + keyLength + 32);

      // Decrypt the AES key with RSA
      const privKeyObj = crypto.createPrivateKey(this.privateKey);
      const aesKey = crypto.privateDecrypt(
        {
          key: privKeyObj,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedAesKey,
      );

      // Decrypt data with AES-256-GCM
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      const aad = Buffer.from('karasu-lab-encryption', 'utf8');
      decipher.setAAD(aad);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err) {
      // Expose a generic error for decryption failures
      throw new BadRequestException('decryption failed');
    }
  }
}
