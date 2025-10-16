import { JWTState } from '@prisma/client';
import prisma from './query';
import { UpdateJwtStateDto } from '../../jwt-state/dto/jwt-state.dto';

export async function createJWTState(
  userId: string,
  params?: { id?: string; revoked?: boolean },
) {
  return prisma.jWTState.create({
    data: {
      ...params,
      userId,
    },
  });
}

export async function getAllJWTState(params?: {
  userId: string;
}): Promise<JWTState[]> {
  return prisma.jWTState.findMany({
    where: {
      userId: params?.userId,
    },
  });
}

export async function getJWTStateById(
  id: string,
  params?: { userId: string },
): Promise<JWTState | null> {
  return prisma.jWTState.findFirst({
    where: {
      id,
      userId: params?.userId,
    },
  });
}

export async function updateJWTState(
  id: string,
  params: UpdateJwtStateDto,
): Promise<JWTState | null> {
  return prisma.jWTState.update({
    where: {
      id,
    },
    data: {
      ...params,
    },
  });
}

export async function deleteJWTState(id: string) {
  await prisma.jWTState.delete({
    where: {
      id,
    },
  });
}

export async function revokeJWTState(id: string): Promise<boolean> {
  try {
    await prisma.jWTState.update({
      where: { id },
      data: { revoked: true },
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function isJWTStateRevoked(id: string): Promise<boolean> {
  const jwtState = await prisma.jWTState.findUnique({
    where: { id },
  });
  return jwtState ? jwtState.revoked : true;
}
