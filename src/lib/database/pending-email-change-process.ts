import prisma from './query';
import { hashString, calculateExpiration } from './utility-functions';

export async function createPendingEmailChangeProcess(data: {
  userId: string;
  newEmail: string;
  code?: string;
  expiresAt?: Date;
}) {
  const verificationCode =
    data.code || Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = hashString(verificationCode);
  const expiresAt = data.expiresAt || calculateExpiration(30); // 30 minutes

  const record = await prisma.pendingEMailChangeProcess.create({
    data: {
      userId: data.userId,
      newEmail: data.newEmail,
      verificationCode: hashedCode,
      expiresAt,
      used: false,
    },
  });

  // Return plain verification code (not hashed) to caller so it can be emailed
  return {
    ...record,
    verificationCode: verificationCode,
  };
}

export async function findPendingByUserId(userId: string) {
  return prisma.pendingEMailChangeProcess.findFirst({
    where: { userId, used: false },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPendingByCode(userId: string, code: string) {
  const rec = await prisma.pendingEMailChangeProcess.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!rec) return null;
  // verificationCode is stored hashed (via hashString)
  const hashed = hashString(code);
  if (rec.verificationCode !== hashed) return null;
  if (rec.used) return null;
  if (rec.expiresAt < new Date()) return null;
  return rec;
}

export async function markPendingAsUsed(id: string) {
  return prisma.pendingEMailChangeProcess.update({
    where: { id },
    data: { used: true },
  });
}

export async function deletePendingById(id: string) {
  return prisma.pendingEMailChangeProcess.delete({ where: { id } });
}
