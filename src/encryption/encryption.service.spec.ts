import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';
import { mock } from 'jest-mock-extended';
import { AppConfigService } from '../app-config/app-config.service';

describe('EncryptionService', () => {
  // generate temporary RSA keypair for tests
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const base64Public = Buffer.from(publicKey, 'utf8').toString('base64');
  const base64Private = Buffer.from(privateKey, 'utf8').toString('base64');

  const mockAppConfig = mock<AppConfigService>({
    get: jest.fn().mockImplementation(() => undefined),
  });

  const service = new EncryptionService(mockAppConfig, {
    publicKey: base64Public,
    privateKey: base64Private,
  });
  service.onModuleInit();

  it('should instantiate with valid keys', () => {
    expect(service).toBeDefined();
  });

  it('should throw on invalid key instantiation', () => {
    const invalidBase = Buffer.from('invalid', 'utf8').toString('base64');
    const invalidService = new EncryptionService(mockAppConfig, {
      publicKey: invalidBase,
      privateKey: invalidBase,
    });
    expect(() => invalidService.onModuleInit()).toThrow();
  });

  it('should throw when encrypt is called with null', () => {
    expect(() => service.encrypt(null)).toThrow();
  });

  it('should throw when decrypt is called with null', () => {
    expect(() => service.decrypt(null)).toThrow();
  });

  it('should encrypt and decrypt a string correctly', () => {
    const service = new EncryptionService(mockAppConfig, {
      publicKey: base64Public,
      privateKey: base64Private,
    });
    service.onModuleInit();
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

  it('should encrypt and decrypt a long string using AES-256-GCM', () => {
    const service = new EncryptionService(mockAppConfig, {
      publicKey: base64Public,
      privateKey: base64Private,
    });
    service.onModuleInit();
    // Create a very long string that would exceed RSA limits but should work with AES
    const longString = 'a'.repeat(1000); // 1000 characters, much larger than RSA limits

    const cipher = service.encrypt(longString);
    expect(typeof cipher).toBe('string');
    expect(cipher.length).toBeGreaterThan(0);

    const decrypted = service.decrypt(cipher);
    expect(decrypted).toBe(longString);
  });

  it('should encrypt and decrypt a very long access token string', () => {
    const service = new EncryptionService(mockAppConfig, {
      publicKey: base64Public,
      privateKey: base64Private,
    });
    service.onModuleInit();
    // Simulate a very long access token (much longer than RSA limits)
    const longAccessToken =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.' +
      'EkN-DOsnsuRjRO6BxXemmJDm3HbxrbRzXglbN2S4sOkopdU4IsDxTI8jO19W_A4K8ZPJijNLis4EZsHeY559a4DFOd50_OqgHs_CjI2vM' +
      'VkF3NruZBDKNlKlLBOl5XZ0y4x8xWGkQ9L6LyPv9k7bXhkM8nHvHKm-ZcJyTKJxQ1AJjqGaZ2VZFF8H5XaF1xZfCdSdYHk-cQ' +
      'AdditionalVeryLongTokenDataThatWouldExceedRSALimitsButShouldWorkWithAESEncryption' +
      'MoreTokenDataToMakeItEvenLongerAndTestTheAESEncryptionCapabilityWithVeryLongStrings';

    const cipher = service.encrypt(longAccessToken);
    expect(typeof cipher).toBe('string');
    expect(cipher.length).toBeGreaterThan(0);

    const decrypted = service.decrypt(cipher);
    expect(decrypted).toBe(longAccessToken);
  });

  it('should handle very large data without size limitations', () => {
    const service = new EncryptionService(mockAppConfig, {
      publicKey: base64Public,
      privateKey: base64Private,
    });
    service.onModuleInit();
    const largeString = 'x'.repeat(10240);

    const cipher = service.encrypt(largeString);
    expect(typeof cipher).toBe('string');
    expect(cipher.length).toBeGreaterThan(0);

    const decrypted = service.decrypt(cipher);
    expect(decrypted).toBe(largeString);
  });
});
