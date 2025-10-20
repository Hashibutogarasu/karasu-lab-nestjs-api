import prisma, { hashString } from './query';

export async function createUserOtp(data: {
  userId: string;
  issuerId: string;
  secretEncrypted: string;
}) {
  return prisma.userOTP.create({
    data: {
      userId: data.userId,
      issuerId: data.issuerId,
      secret: data.secretEncrypted,
    },
  });
}

export async function getUserOtpByUserId(userId: string) {
  return prisma.userOTP.findFirst({
    where: { userId },
    include: { backupCodes: true },
  });
}

export async function getUserOtpById(id: string) {
  return prisma.userOTP.findUnique({
    where: { id },
    include: { backupCodes: true },
  });
}

export async function setLastAuthenticatedAt(userOtpId: string, at: Date) {
  return prisma.userOTP.update({
    where: { id: userOtpId },
    data: { lastAuthenticatedAt: at },
  });
}

export async function createBackupCodes(userOtpId: string, codes: string[]) {
  const now = new Date();
  const createMany = codes.map((c) => ({
    userOtpId,
    hashedCode: hashString(c),
    createdAt: now,
  }));
  return prisma.oTPBackupCode.createMany({ data: createMany });
}

export async function findBackupCode(userOtpId: string, plainCode: string) {
  const hashed = hashString(plainCode);
  return prisma.oTPBackupCode.findFirst({
    where: { userOtpId, hashedCode: hashed },
  });
}

export async function deleteBackupCodesForUserOtp(userOtpId: string) {
  return prisma.oTPBackupCode.deleteMany({ where: { userOtpId } });
}

export async function deleteUserOtpById(id: string) {
  return prisma.userOTP.delete({ where: { id } });
}

export async function deleteBackupCodeById(id: string) {
  return prisma.oTPBackupCode.delete({ where: { id } });
}

export async function userHasOtpEnabled(userId: string) {
  const rec = await prisma.userOTP.findFirst({
    where: { userId, setupCompleted: true },
  });
  return rec !== null;
}

export async function setSetupCompleted(userOtpId: string, completed: boolean) {
  return prisma.userOTP.update({
    where: { id: userOtpId },
    data: { setupCompleted: completed },
  });
}
