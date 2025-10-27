import type { OAuthClient } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      client?: OAuthClient;
    }
  }
}

export {};
