import { Injectable } from '@nestjs/common';
import { UtilityService } from '../../../data-base/utility/utility.service';

@Injectable()
export class ManagerService {
  constructor(private readonly utilityService: UtilityService) {}

  private static sessions = new Map<
    string,
    { userId: string; expiresAt: Date }
  >();

  createSession(userId: string): string {
    const sessionId = this.utilityService.hashString(
      userId + Date.now() + Math.random(),
    );
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    ManagerService.sessions.set(sessionId, { userId, expiresAt });
    return sessionId;
  }

  getSession(sessionId: string): { userId: string } | null {
    const session = ManagerService.sessions.get(sessionId);
    if (!session) return null;

    // 有効期限チェック
    if (session.expiresAt < new Date()) {
      ManagerService.sessions.delete(sessionId);
      return null;
    }

    return { userId: session.userId };
  }

  deleteSession(sessionId: string): boolean {
    return ManagerService.sessions.delete(sessionId);
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of ManagerService.sessions.entries()) {
      if (session.expiresAt < now) {
        ManagerService.sessions.delete(sessionId);
      }
    }
  }
}
