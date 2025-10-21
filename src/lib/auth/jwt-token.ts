import { Role } from '@prisma/client';

export interface JWTPayload {
  id: string; // JWT State ID
  sub: string; // User ID
  // Keep payload minimal for security
  provider?: string;
  iat?: number;
  exp?: number;
}

export interface CreateTokenRequest {
  userId: string;
  provider?: string;
  expirationHours?: number;
  // If provided, reuse existing JWTState instead of creating a new one
  jwtStateId?: string;
}

export interface CreateTokenResponse {
  success: boolean;
  jwtId?: string;
  token?: string;
  profile?: {
    sub: string;
    name: string;
    email: string;
    provider?: string;
    providers: string[];
  };
  user?: {
    roles: Role[];
  };
  expiresAt?: Date;
  error?: string;
  errorDescription?: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
  errorDescription?: string;
}
