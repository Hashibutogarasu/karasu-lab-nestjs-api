jest.mock('./query', () => ({
  __esModule: true,
  default: {
    oTPBackupCode: {
      createMany: jest.fn(() => ({ count: 2 })),
    },
  },
  hashString: (s: string) => `hashed:${s}`,
}));

import { createBackupCodes } from './mfa-query';
import prisma from './query';

describe('mfa-query.createBackupCodes', () => {
  it('hashes backup codes before saving via prisma.oTPBackupCode.createMany', async () => {
    const userOtpId = 'uo-123';
    const codes = ['CODE1', 'CODE2'];

    const result = await createBackupCodes(userOtpId, codes);

    expect(
      (prisma.oTPBackupCode.createMany as jest.Mock).mock.calls.length,
    ).toBe(1);

    // Inspect the argument passed to createMany
    const arg = (prisma.oTPBackupCode.createMany as jest.Mock).mock.calls[0][0];
    expect(arg).toHaveProperty('data');
    const data = arg.data;
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);

    // Each entry should have userOtpId and hashedCode using our mocked hashString
    expect(data[0]).toMatchObject({ userOtpId, hashedCode: 'hashed:CODE1' });
    expect(data[1]).toMatchObject({ userOtpId, hashedCode: 'hashed:CODE2' });

    // And the function should return the prisma result
    expect(result).toEqual({ count: 2 });
  });
});
