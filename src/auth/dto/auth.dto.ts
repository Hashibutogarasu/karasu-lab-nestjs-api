export interface AuthStateDto {
  provider: string;
  callbackUrl: string;
}

export interface VerifyTokenDto {
  stateCode: string;
  oneTimeToken: string;
}
