import { Role } from '@prisma/client';
import prisma, { hashString } from './query';
import { PublicUser } from '../../auth/decorators/auth-user.decorator';

/**
 * ユーザー名でユーザーを取得
 */
export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

/**
 * メールアドレスでユーザーを取得
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUsersByDomain(domain: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        {
          email: {
            contains: `@${domain}`,
          },
        },
      ],
    },
  });
}

/**
 * ユーザーIDでユーザーを取得
 */
export async function findUserById(
  userId: string,
  { passwordHash = false } = {},
) {
  return prisma.user.findFirst({
    where: { id: userId },
    omit: {
      passwordHash: passwordHash,
    },
    include: {
      extraProfiles: true,
      roles: true,
    },
  });
}

/**
 * ユーザー名を更新
 */
export async function updateUserNameById(userId: string, username: string) {
  const existingUser = await findUserByUsername(username);
  if (existingUser && existingUser.id !== userId) {
    throw new Error('Username already taken');
  }
  return prisma.user.update({
    where: { id: userId },
    data: { username },
  });
}

export async function updateUserRoles(userId: string, roles: Role[]) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        set: roles.map((role) => ({ id: role.id })),
      },
    },
  });
}

/**
 * ユーザーを作成
 */
export async function createUser(data: {
  username: string;
  email: string;
  password: string;
}) {
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      passwordHash: hashString(data.password),
    },
    select: {
      id: true,
      username: true,
      email: true,
      roles: true,
      passwordHash: false,
    },
  });
}

/**
 * ユーザーパスワードを検証
 */
export async function verifyUserPassword(
  usernameOrEmail: string,
  password: string,
): Promise<PublicUser | null> {
  // ユーザー名またはメールアドレスでユーザーを検索
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      providers: true,
      passwordHash: true,
      roles: true,
      extraProfiles: true,
    },
  });

  if (!user) {
    return null;
  }

  const hashedPassword = hashString(password);
  const isValid = user.passwordHash === hashedPassword;

  if (!isValid) return null;

  // Remove passwordHash before returning as PublicUser
  const { passwordHash, ...publicUser } = user;
  return publicUser as PublicUser;
}

/**
 * 全てのユーザーを取得（管理者向け）
 */
export async function findAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // passwordHashは含めない（セキュリティ上の理由）
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * ユーザー情報を更新
 */
export async function updateUser(
  userId: string,
  data: Partial<{
    username: string;
    email: string;
    password: string;
  }>,
) {
  const updateData: any = {};

  if (data.username) {
    updateData.username = data.username;
  }
  if (data.email) {
    updateData.email = data.email;
  }
  if (data.password) {
    updateData.passwordHash = hashString(data.password);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // passwordHashは含めない
    },
  });
}

/**
 * ユーザーを削除
 */
export async function deleteUser(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      // passwordHashは含めない
    },
  });
}
