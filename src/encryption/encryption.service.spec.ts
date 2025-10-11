import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
  // generate temporary RSA keypair for tests
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const service = new EncryptionService({ publicKey, privateKey });

  it('should instantiate with valid keys', () => {
    expect(service).toBeDefined();
  });

  it('should throw on invalid key instantiation', () => {
    expect(
      () =>
        new EncryptionService({ publicKey: 'invalid', privateKey: 'invalid' }),
    ).toThrow();
  });

  it('should throw when encrypt is called with null', () => {
    expect(() => service.encrypt(null)).toThrow();
  });

  it('should throw when decrypt is called with null', () => {
    expect(() => service.decrypt(null)).toThrow();
  });

  it('should encrypt and decrypt a string correctly', () => {
    const service = new EncryptionService({ publicKey, privateKey });
    const plain = 'hello RSA-OAEP with sha256 🎉';
    const cipher = service.encrypt(plain);
    expect(typeof cipher).toBe('string');
    const decrypted = service.decrypt(cipher);
    expect(decrypted).toBe(plain);
  });

  it('should throw when decrypting invalid ciphertext', () => {
    // Provide some random base64 that won't decrypt
    const bad = Buffer.from('this is not encrypted').toString('base64');
    expect(() => service.decrypt(bad)).toThrow();
  });

  it('should encrypt and decrypt a long string within RSA limits', () => {
    const service = new EncryptionService({ publicKey, privateKey });
    // Create a string that's close to RSA-OAEP limit (190 bytes) but still valid
    const longString = 'a'.repeat(180); // 180 characters, well within the 190-byte limit

    const cipher = service.encrypt(longString);
    expect(typeof cipher).toBe('string');
    expect(cipher.length).toBeGreaterThan(0);

    const decrypted = service.decrypt(cipher);
    expect(decrypted).toBe(longString);
  });

  it('should throw when trying to encrypt data too large for RSA', () => {
    const service = new EncryptionService({ publicKey, privateKey });
    // Create a string that exceeds RSA-OAEP limit (190 bytes)
    const tooLongString = 'a'.repeat(200); // 200 characters, exceeds the limit

    expect(() => service.encrypt(tooLongString)).toThrow(
      'Data too large for RSA encryption',
    );
  });
});
