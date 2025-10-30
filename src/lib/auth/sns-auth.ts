export interface SnsProfile {
  providerId: string;
  provider: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  rawProfile: any;
}

export interface AuthStateRequest {
  provider: string;
  callbackUrl: string;
  userId?: string;
}

export interface AuthStateResponse {
  success: boolean;
  stateCode?: string;
  error?: string;
  errorDescription?: string;
}

export interface VerifyTokenRequest {
  stateCode: string;
  oneTimeToken: string;
  jwtStateId?: string;
}
