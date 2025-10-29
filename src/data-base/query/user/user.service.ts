import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  publicUserSchema,
  type PublicUser,
} from '../../../auth/decorators/auth-user.decorator';
import { PrismaClient, Role, User } from '@prisma/client';
import { DataBaseService } from '../../data-base.service';
import { UtilityService } from '../../utility/utility.service';
import { RoleDefinitions } from '../../../types/roles';
import { RoleService } from '../role/role.service';
import { AppErrorCodes } from '../../../types/error-codes';

@Injectable()
export class UserService {
  private prisma: PrismaClient;

  constructor(
    private readonly databaseService: DataBaseService,
    private readonly utilityService: UtilityService,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {
    this.prisma = this.databaseService.prisma();
  }

  /**
   * ユーザー名でユーザーを取得
   */
  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * メールアドレスでユーザーを取得
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUsersByDomain(domain: string) {
    return this.prisma.user.findMany({
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
  async findUserById(userId: string, { passwordHash = false } = {}) {
    return this.prisma.user.findFirst({
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
  async updateUserNameById(userId: string, username: string) {
    const existingUser = await this.findUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Username already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { username },
    });
  }

  async updateUserRoles(userId: string, roles: Role[]) {
    return this.prisma.user.update({
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
  async createUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<PublicUser> {
    return publicUserSchema.parse(
      await this.prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          passwordHash: this.utilityService.hashString(data.password),
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          providers: true,
          extraProfiles: true,
          roles: true,
          passwordHash: false,
        },
      }),
    );
  }

  /**
   * ユーザーパスワードを検証
   */
  async verifyUserPassword(
    usernameOrEmail: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
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

    const hashedPassword = this.utilityService.hashString(password);
    const isValid = user.passwordHash === hashedPassword;

    if (!isValid) return null;

    return user;
  }

  /**
   * 全てのユーザーを取得（管理者向け）
   */
  async findAllUsers() {
    return this.prisma.user.findMany({
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
  async updateUser(
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
      updateData.passwordHash = this.utilityService.hashString(data.password);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * ユーザーを削除
   */
  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  /**
   * ユーザーのプロバイダーリストに追加
   */
  async addUserProvider(userId: string, provider: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { providers: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.providers.includes(provider)) {
      return;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        providers: {
          push: provider,
        },
      },
    });
  }

  /**
   * SNSユーザーを作成（パスワード不要）
   */
  async createSnsUser(data: {
    username: string;
    email: string;
    provider: string;
  }) {
    return this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        providers: [data.provider],
      },
    });
  }

  async exists(userId: string) {
    return (await this.findUserById(userId)) !== undefined;
  }

  async findAll() {
    return this.findAllUsers();
  }

  async findById(userId: string) {
    return this.findUserById(userId);
  }

  async findByEmail(email: string) {
    return this.findUserByEmail(email);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });
    if (!user) {
      throw AppErrorCodes.USER_NOT_FOUND;
    }
    return user.roles.map((role) => role.name);
  }

  async updateUserRolesByDefines(userId: string, roleDefinitions: string[]) {
    const requestedRoles: Role[] = roleDefinitions
      .map((k) => {
        return (RoleDefinitions as any)[k as keyof typeof RoleDefinitions];
      })
      .filter((r): r is Role => !!r);

    const rolesWithNulls = await Promise.all(
      requestedRoles.map((role) => this.roleService.findRoleByName(role.name)),
    );
    const roles = rolesWithNulls.filter(
      (role): role is NonNullable<typeof role> => role !== null,
    );
    return this.roleService.updateUserRoles(userId, roles);
  }
}
